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
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    private readonly logger: Logger,
  ) {}

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

      // Verify that employee and company are matched
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
            },
            sendPush: true,
          },
        );
      }

      return new CreateInterviewResponseDTO(saved);
    } catch (error: any) {
      this.logger.error(error?.message || error);
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
            data: { interviewId: interview.id },
            sendPush: true,
          },
        );
      }

      return new UpdateInterviewStatusResponseDTO(saved);
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message:
          error?.message ||
          'An error occurred while updating interview status.',
        statusCode: error?.statusCode || 500,
      });
    }
  }
}
