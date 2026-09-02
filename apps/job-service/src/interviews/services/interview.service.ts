import { Application } from '@app/common/database/entities/application.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import {
  CreateInterviewDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  GetInterviewsByCompanyDTO,
  GetInterviewsByEmployeeDTO,
  InterviewStatus,
  UpdateInterviewStatusResponseDTO,
  UpdateInterviewStatusDTO,
  VALID_STATUS_TRANSITIONS,
} from '@app/contracts/dtos/job';
import { IInterviewService } from '@app/contracts/interfaces/service/job-service.interface';
import { JOB } from '@app/contracts/constants/domain/job.constant';
import {
  APPLICATION_STATUS_TRANSITIONS,
  EApplicationStatus,
} from '@app/common/database/enums/application-status.enum';

@Injectable()
export class InterviewService implements IInterviewService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    private readonly logger: Logger,
  ) {}

  /**
   * Resolve `applicationId` to an application this company may actually
   * schedule against: it must be theirs, it must belong to the employee named
   * in the request, and it must not already be closed. A mismatch is a 403
   * rather than a silent fall-through to the match gate — the caller asked for
   * a specific application and should be told it was not usable.
   */
  private async loadSchedulableApplication(
    createInterview: CreateInterviewDTO,
  ): Promise<Application | null> {
    const application = await this.applicationRepo.findOne({
      where: { id: createInterview.applicationId },
      relations: ['job', 'job.company', 'employee'],
    });

    if (
      !application ||
      application.job?.company?.id !== createInterview.companyId ||
      application.employee?.id !== createInterview.employeeId
    ) {
      throw new RpcException({
        message: 'Application not found or access denied.',
        statusCode: 403,
      });
    }

    const closed: EApplicationStatus[] = [
      EApplicationStatus.HIRED,
      EApplicationStatus.REJECTED,
      EApplicationStatus.WITHDRAWN,
    ];
    if (closed.includes(application.status)) {
      throw new RpcException({
        message: `Cannot schedule an interview for a ${application.status} application.`,
        statusCode: 400,
      });
    }

    return application;
  }

  async createInterview(
    createInterview: CreateInterviewDTO,
  ): Promise<CreateInterviewResponseDTO> {
    try {
      // Only companies can schedule interviews (standard hiring flow)
      if (createInterview.createdBy !== 'company') {
        throw new RpcException({
          message: 'Only companies can schedule interviews.',
          statusCode: 403,
        });
      }

      /*
        Two ways to earn the right to schedule an interview, and they mean the
        same thing: the candidate has said yes to this company. A mutual match
        says it, and so does an application — which is why an applicationId
        satisfies the gate on its own rather than additionally requiring a
        match that an applicant has no reason to have made.
      */
      const application = createInterview.applicationId
        ? await this.loadSchedulableApplication(createInterview)
        : null;

      if (!application) {
        const match = await this.jobMatchingRepo.findOne({
          where: {
            employee: { id: createInterview.employeeId },
            company: { id: createInterview.companyId },
            isMatched: true,
          },
        });

        if (!match) {
          throw new RpcException({
            message: 'You can only schedule interviews with matches.',
            statusCode: 403,
          });
        }
      }

      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: createInterview.employeeId },
          relations: ['user'],
        }),
        this.companyRepo.findOne({
          where: { id: createInterview.companyId },
          relations: ['user'],
        }),
      ]);

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      const interview = this.interviewRepo.create({
        employee,
        company,
        application,
        title: createInterview.title,
        description: createInterview.description,
        scheduledAt: new Date(createInterview.scheduledAt),
        durationMinutes:
          createInterview.durationMinutes || JOB.DEFAULT_INTERVIEW_DURATION,
        location: createInterview.location,
        meetingLink: createInterview.meetingLink,
        status: 'pending',
        createdBy: createInterview.createdBy,
      });

      const saved = await this.interviewRepo.save(interview);

      /*
        Scheduling the interview is the stage change; making the company also
        set INTERVIEWING by hand would just be a second place for the pipeline
        to drift out of step with what has actually happened. Only from
        SHORTLISTED, which is the one edge the transition map allows — an
        application already at OFFERED does not move backwards because someone
        booked a follow-up call.
      */
      if (
        application &&
        APPLICATION_STATUS_TRANSITIONS[application.status]?.includes(
          EApplicationStatus.INTERVIEWING,
        )
      ) {
        application.status = EApplicationStatus.INTERVIEWING;
        application.statusChangedAt = new Date();
        await this.applicationRepo.save(application);
      }

      // Notify the other party
      const targetUserId =
        createInterview.createdBy === 'company'
          ? employee.user?.id
          : company.user?.id;
      const senderName =
        createInterview.createdBy === 'company'
          ? company.name
          : employee.username || employee.firstname;

      if (targetUserId) {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: targetUserId,
            title: 'Interview Scheduled',
            message: `${senderName} wants to schedule an interview: ${createInterview.title}`,
            type: 'interview',
            data: {
              interviewId: saved.id,
              employeeId: createInterview.employeeId,
              companyId: createInterview.companyId,
              senderName,
              interviewTitle: createInterview.title,
              eventType: 'interview_scheduled',
            },
            sendPush: true,
          },
        );
      }

      const response = new CreateInterviewResponseDTO(saved);
      /*
        Reuse targetUserId rather than resolving the side a second time. This
        read `employee.user?.id` directly, which agrees with targetUserId only
        because createdBy is guarded to 'company' above. Two expressions of one
        decision is what drifts if that guard is ever relaxed; there is now one.
      */
      response.notifyUserId = targetUserId ?? null;
      // `saved.application` is the full entity; callers only need the id, and
      // serialising the whole application across the RPC hop would leak the
      // employee and company it hangs off.
      response.applicationId = application?.id ?? null;
      return response;
    } catch (error: any) {
      this.logger.error(error?.message || error);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message:
          error?.message || 'An error occurred while creating the interview.',
        statusCode: error?.statusCode || 500,
      });
    }
  }

  async getInterviewsByEmployee(
    getInterviewsByEmployeeDTO: GetInterviewsByEmployeeDTO,
  ): Promise<GetInterviewResponseDTO[]> {
    try {
      const interviews = await this.interviewRepo.find({
        where: { employee: { id: getInterviewsByEmployeeDTO.employeeId } },
        relations: ['employee', 'company'],
        order: { scheduledAt: 'ASC' },
      });
      return interviews.map(
        (interview) => new GetInterviewResponseDTO(interview),
      );
    } catch (error: any) {
      this.logger.error(error?.message || error);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message:
          error?.message || 'An error occurred while fetching interviews.',
        statusCode: 500,
      });
    }
  }

  async getInterviewsByCompany(
    getInterviewsByCompanyDTO: GetInterviewsByCompanyDTO,
  ): Promise<GetInterviewResponseDTO[]> {
    try {
      const interviews = await this.interviewRepo.find({
        where: { company: { id: getInterviewsByCompanyDTO.companyId } },
        relations: ['employee', 'company'],
        order: { scheduledAt: 'ASC' },
      });
      return interviews.map(
        (interview) => new GetInterviewResponseDTO(interview),
      );
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message:
          error?.message || 'An error occurred while fetching interviews.',
        statusCode: 500,
      });
    }
  }

  async updateInterviewStatus(
    updateInterviewDTO: UpdateInterviewStatusDTO,
  ): Promise<UpdateInterviewStatusResponseDTO> {
    try {
      const interview = await this.interviewRepo.findOne({
        where: { id: updateInterviewDTO.interviewId },
        relations: ['employee', 'employee.user', 'company', 'company.user'],
      });

      if (!interview) {
        throw new RpcException({
          message: 'Interview not found.',
          statusCode: 404,
        });
      }

      // ── Access control: verify the requester is involved in this interview ──
      const employeeUserId = interview.employee?.user?.id;
      const companyUserId = interview.company?.user?.id;

      if (
        updateInterviewDTO.requestUserId !== employeeUserId &&
        updateInterviewDTO.requestUserId !== companyUserId
      ) {
        throw new RpcException({
          message: 'You are not involved in this interview.',
          statusCode: 403,
        });
      }

      // ── Role-based action control ──
      const isEmployee = updateInterviewDTO.requestUserId === employeeUserId;
      const isCompany = updateInterviewDTO.requestUserId === companyUserId;

      // Employees can only accept or decline pending interviews
      if (
        isEmployee &&
        ![InterviewStatus.ACCEPTED, InterviewStatus.DECLINED].includes(
          updateInterviewDTO.status,
        )
      ) {
        throw new RpcException({
          message: 'Employees can only accept or decline interviews.',
          statusCode: 403,
        });
      }

      // Companies can only cancel or mark as completed
      if (
        isCompany &&
        ![InterviewStatus.CANCELLED, InterviewStatus.COMPLETED].includes(
          updateInterviewDTO.status,
        )
      ) {
        throw new RpcException({
          message: 'Companies can only cancel or complete interviews.',
          statusCode: 403,
        });
      }

      // ── Status transition validation ──
      const allowedTransitions =
        VALID_STATUS_TRANSITIONS[interview.status] || [];
      if (!allowedTransitions.includes(updateInterviewDTO.status)) {
        throw new RpcException({
          message: `Cannot transition from "${interview.status}" to "${updateInterviewDTO.status}".`,
          statusCode: 400,
        });
      }

      interview.status = updateInterviewDTO.status;
      const saved = await this.interviewRepo.save(interview);

      // Notify only the OTHER party — the actor already knows what they did.
      const notifyUserId = isEmployee ? companyUserId : employeeUserId;
      const statusLabel =
        updateInterviewDTO.status.charAt(0).toUpperCase() +
        updateInterviewDTO.status.slice(1);

      if (notifyUserId) {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: notifyUserId,
            title: `Interview ${statusLabel}`,
            message: `Interview "${interview.title}" has been ${updateInterviewDTO.status}.`,
            type: 'interview',
            data: {
              interviewId: interview.id,
              senderName: isEmployee
                ? interview.employee.username || interview.employee.firstname
                : interview.company.name,
              interviewTitle: interview.title,
              status: updateInterviewDTO.status,
              eventType: `interview_${updateInterviewDTO.status}`,
            },
            sendPush: true,
          },
        );
      }

      const response = new UpdateInterviewStatusResponseDTO(saved);
      response.notifyUserId = notifyUserId ?? null;
      return response;
    } catch (error: any) {
      this.logger.error(error?.message || error);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message:
          error?.message ||
          'An error occurred while updating interview status.',
        statusCode: error?.statusCode || 500,
      });
    }
  }
}
