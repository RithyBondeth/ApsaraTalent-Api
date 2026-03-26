import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { NOTIFICATION_SERVICE } from 'utils/constants/notification.constant';
import { CreateInterviewDto, InterviewStatus, UpdateInterviewStatusDto, VALID_STATUS_TRANSITIONS } from '../dtos/interview.dto';

@Injectable()
export class InterviewService {
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

  async createInterview(dto: CreateInterviewDto): Promise<Interview> {
    try {
      // Only companies can schedule interviews (standard hiring flow)
      if (dto.createdBy !== 'company') {
        throw new RpcException({
          message: 'Only companies can schedule interviews.',
          statusCode: 403,
        });
      }

      // Verify that employee and company are matched
      const match = await this.jobMatchingRepo.findOne({
        where: {
          employee: { id: dto.employeeId },
          company: { id: dto.companyId },
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
          where: { id: dto.employeeId },
          relations: ['user'],
        }),
        this.companyRepo.findOne({
          where: { id: dto.companyId },
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
        title: dto.title,
        description: dto.description,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes || 30,
        location: dto.location,
        meetingLink: dto.meetingLink,
        status: 'pending',
        createdBy: dto.createdBy,
      });

      const saved = await this.interviewRepo.save(interview);

      // Notify the other party
      const targetUserId =
        dto.createdBy === 'company' ? employee.user?.id : company.user?.id;
      const senderName =
        dto.createdBy === 'company'
          ? company.name
          : (employee.username || employee.firstname);

      if (targetUserId) {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: targetUserId,
            title: 'Interview Scheduled',
            message: `${senderName} wants to schedule an interview: ${dto.title}`,
            type: 'interview',
            data: {
              interviewId: saved.id,
              employeeId: dto.employeeId,
              companyId: dto.companyId,
            },
            sendPush: true,
          },
        );
      }

      return saved;
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while creating the interview.',
        statusCode: error?.statusCode || 500,
      });
    }
  }

  async getInterviewsByEmployee(employeeId: string): Promise<Interview[]> {
    try {
      return this.interviewRepo.find({
        where: { employee: { id: employeeId } },
        relations: ['company'],
        order: { scheduledAt: 'ASC' },
      });
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while fetching interviews.',
        statusCode: 500,
      });
    }
  }

  async getInterviewsByCompany(companyId: string): Promise<Interview[]> {
    try {
      return this.interviewRepo.find({
        where: { company: { id: companyId } },
        relations: ['employee'],
        order: { scheduledAt: 'ASC' },
      });
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while fetching interviews.',
        statusCode: 500,
      });
    }
  }

  async updateInterviewStatus(dto: UpdateInterviewStatusDto): Promise<Interview> {
    try {
      const interview = await this.interviewRepo.findOne({
        where: { id: dto.interviewId },
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

      if (dto.requestUserId !== employeeUserId && dto.requestUserId !== companyUserId) {
        throw new RpcException({
          message: 'You are not involved in this interview.',
          statusCode: 403,
        });
      }

      // ── Role-based action control ──
      const isEmployee = dto.requestUserId === employeeUserId;
      const isCompany = dto.requestUserId === companyUserId;

      // Employees can only accept or decline pending interviews
      if (isEmployee && ![InterviewStatus.ACCEPTED, InterviewStatus.DECLINED].includes(dto.status)) {
        throw new RpcException({
          message: 'Employees can only accept or decline interviews.',
          statusCode: 403,
        });
      }

      // Companies can only cancel or mark as completed
      if (isCompany && ![InterviewStatus.CANCELLED, InterviewStatus.COMPLETED].includes(dto.status)) {
        throw new RpcException({
          message: 'Companies can only cancel or complete interviews.',
          statusCode: 403,
        });
      }

      // ── Status transition validation ──
      const allowedTransitions = VALID_STATUS_TRANSITIONS[interview.status] || [];
      if (!allowedTransitions.includes(dto.status)) {
        throw new RpcException({
          message: `Cannot transition from "${interview.status}" to "${dto.status}".`,
          statusCode: 400,
        });
      }

      interview.status = dto.status;
      const saved = await this.interviewRepo.save(interview);

      // Notify both parties about the status change
      const statusLabel = dto.status.charAt(0).toUpperCase() + dto.status.slice(1);

      [employeeUserId, companyUserId].filter(Boolean).forEach((userId) => {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId,
            title: `Interview ${statusLabel}`,
            message: `Interview "${interview.title}" has been ${dto.status}.`,
            type: 'interview',
            data: { interviewId: interview.id },
            sendPush: true,
          },
        );
      });

      return saved;
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while updating interview status.',
        statusCode: error?.statusCode || 500,
      });
    }
  }
}
