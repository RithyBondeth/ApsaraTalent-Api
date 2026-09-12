import { Application } from '@app/common/database/entities/application.entity';
import { ApplicationNote } from '@app/common/database/entities/application-note.entity';
import { ApplicationStatusHistory } from '@app/common/database/entities/application-status-history.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { User } from '@app/common/database/entities/user.entity';
import {
  APPLICATION_STATUS_TRANSITIONS,
  EApplicationStatus,
  WITHDRAWABLE_APPLICATION_STATUSES,
} from '@app/common/database/enums/application-status.enum';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { In, IsNull, Repository } from 'typeorm';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { AnalyticsService, EAnalyticsEvent } from '@app/common/analytics';
import { MatchLinkService } from '../../matching/services/match-link.service';
import {
  IApplicationService,
  ApplicationNoteResponseDTO,
  ApplicationStatusHistoryEntryDTO,
  ApplyApplicationDTO,
  ApplyApplicationResponseDTO,
  BulkUpdateApplicationStatusDTO,
  BulkUpdateApplicationStatusItemResultDTO,
  BulkUpdateApplicationStatusResponseDTO,
  CreateApplicationNoteDTO,
  GetApplicationResponseDTO,
  JobPipelineResponseDTO,
  PipelineColumnDTO,
  UpdateApplicationStatusDTO,
  UpdateApplicationStatusResponseDTO,
} from '@app/contracts';

/**
 * The stage columns the kanban board renders, in the order they appear. The
 * end-state buckets (HIRED, REJECTED, WITHDRAWN) and the legacy REVIEWED are
 * intentionally omitted: the board is the live pipeline, and a completed row
 * belongs on the analytics dashboard, not in the recruiter's daily view.
 */
const PIPELINE_COLUMN_ORDER: EApplicationStatus[] = [
  EApplicationStatus.PENDING,
  EApplicationStatus.SHORTLISTED,
  EApplicationStatus.INTERVIEWING,
  EApplicationStatus.OFFERED,
];

/**
 * What the candidate is told when their application moves. Keyed by the status
 * being entered, so the copy lives in one place instead of being assembled at
 * the emit site.
 *
 * REVIEWED and PENDING are absent: nothing transitions into them, and a
 * notification saying "your application is pending" is noise. WITHDRAWN is
 * absent because the candidate is the one who withdrew.
 */
const APPLICATION_STATUS_NOTICE: Partial<
  Record<
    EApplicationStatus,
    { title: string; message: (job: string) => string }
  >
> = {
  [EApplicationStatus.SHORTLISTED]: {
    title: 'You have been shortlisted',
    message: (job) => `Your application for ${job} has been shortlisted.`,
  },
  [EApplicationStatus.INTERVIEWING]: {
    title: 'Moving to interview',
    message: (job) =>
      `Your application for ${job} has reached the interview stage.`,
  },
  [EApplicationStatus.OFFERED]: {
    title: 'You have an offer',
    message: (job) => `You have received an offer for ${job}.`,
  },
  [EApplicationStatus.HIRED]: {
    title: 'You have been hired',
    message: (job) => `Congratulations — you have been hired for ${job}.`,
  },
  [EApplicationStatus.REJECTED]: {
    title: 'Application closed',
    message: (job) => `Your application for ${job} was not taken forward.`,
  },
};

@Injectable()
export class ApplicationService implements IApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(ApplicationNote)
    private readonly noteRepo: Repository<ApplicationNote>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    private readonly analyticsService: AnalyticsService,
    private readonly matchLink: MatchLinkService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ApplicationService.name);
  }

  /**
   * Append one row to the status trail. Deliberately non-fatal — a logging
   * miss should not roll back a real stage change; the analytics event still
   * fires, and the missing entry shows up as a gap rather than a lost move.
   */
  private async logStatusChange(
    applicationId: string,
    from: EApplicationStatus | null,
    to: EApplicationStatus,
    actorUserId: string | null,
    note?: string | null,
  ): Promise<void> {
    try {
      await this.historyRepo.save(
        this.historyRepo.create({
          application: { id: applicationId } as Application,
          from,
          to,
          actor: actorUserId ? ({ id: actorUserId } as User) : null,
          note: note ?? null,
        }),
      );
    } catch (error) {
      this.logger.warn(
        (error as Error).message || 'Could not write status history row',
      );
    }
  }

  /**
   * Guard for every note and history read/write. Returns the loaded
   * application (with `job.company`) so callers do not fetch it twice.
   */
  private async loadOwnedApplication(
    applicationId: string,
    companyId: string,
  ): Promise<Application> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['job', 'job.company', 'employee', 'employee.user'],
    });
    if (!application || application.job?.company?.id !== companyId) {
      throw new RpcException({
        message: 'Application not found or access denied',
        statusCode: 404,
      });
    }
    return application;
  }

  /**
   * The fields every application response carries, as a plain object so each
   * call site can wrap them in its own DTO class rather than casting one into
   * another.
   */
  private toResponseFields(
    application: Application,
  ): Partial<ApplyApplicationResponseDTO> {
    return {
      id: application.id,
      status: application.status,
      coverLetterNote: application.coverLetterNote ?? undefined,
      rejectionReason: application.rejectionReason ?? null,
      reviewedAt: application.reviewedAt ?? null,
      statusChangedAt: application.statusChangedAt ?? null,
      appliedAt: application.appliedAt,
      jobId: application.job?.id,
      jobTitle: application.job?.title,
      employeeId: application.employee?.id,
      employeeName: application.employee?.username,
    };
  }

  /**
   * `JobMatching.matchScore` for each of these employees against one company,
   * as a lookup. Empty map when there is nothing to look up, so callers never
   * have to guard the query themselves. A scoring failure returns an empty map
   * rather than throwing: a missing score should cost the company a column, not
   * their applicant list.
   */
  private async matchScoresFor(
    employeeIds: string[],
    companyId: string,
  ): Promise<Map<string, number | null>> {
    if (!employeeIds.length) return new Map();

    try {
      const rows = await this.jobMatchingRepo.find({
        where: {
          employee: { id: In(employeeIds) },
          company: { id: companyId },
        },
        relations: ['employee'],
        select: { id: true, matchScore: true, employee: { id: true } },
      });
      return new Map(
        rows.map((row) => [row.employee?.id, row.matchScore] as const),
      );
    } catch (error) {
      this.logger.warn(
        (error as Error).message || 'Could not load applicant match scores',
      );
      return new Map();
    }
  }

  async applyApplication(
    employeeId: string,
    applyApplicationDTO: ApplyApplicationDTO,
  ): Promise<ApplyApplicationResponseDTO> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { user: { id: employeeId } },
      });
      if (!employee)
        throw new RpcException({
          message: 'Employee not found',
          statusCode: 404,
        });

      const job = await this.jobRepo.findOne({
        where: { id: applyApplicationDTO.jobId },
        relations: ['company', 'company.user'],
      });
      if (!job)
        throw new RpcException({ message: 'Job not found', statusCode: 404 });

      const existing = await this.applicationRepo.findOne({
        where: {
          employee: { id: employee.id },
          job: { id: applyApplicationDTO.jobId },
        },
      });

      /*
        A withdrawn application is no longer a deleted row, so the duplicate
        check has to stop treating it as one. Reviving the existing row rather
        than inserting a second keeps one application per (employee, job) —
        which the rest of the feature already assumes — while letting somebody
        who withdrew change their mind.
      */
      let application: Application;
      if (existing && existing.status !== EApplicationStatus.WITHDRAWN) {
        throw new RpcException({
          message: 'You have already applied to this job',
          statusCode: 409,
        });
      } else if (existing) {
        existing.status = EApplicationStatus.PENDING;
        existing.coverLetterNote = applyApplicationDTO.coverLetterNote ?? null;
        existing.rejectionReason = null;
        existing.reviewedAt = null;
        existing.statusChangedAt = new Date();
        application = existing;
      } else {
        application = this.applicationRepo.create({
          employee,
          job,
          status: EApplicationStatus.PENDING,
          coverLetterNote: applyApplicationDTO.coverLetterNote ?? null,
          rejectionReason: null,
          reviewedAt: null,
          statusChangedAt: null,
        });
      }

      const saved = await this.applicationRepo.save(application);

      // The first row in the trail: null → PENDING. Written after the save so
      // it can carry the real application id.
      await this.logStatusChange(
        saved.id,
        null,
        EApplicationStatus.PENDING,
        employeeId,
        null,
      );

      /*
        Applying is a like — the same half of the handshake a swipe is, aimed
        at a role instead of a company. Recording it here is what keeps
        applications inside the matching loop rather than beside it: if this
        company had already liked the candidate, the pair matches now.

        Deliberately non-fatal. The application is the thing the candidate
        asked for, and a scoring or cache failure should not cost them it —
        shortlisting records the same interest again, so a miss self-heals.
      */
      const companyId = job.company?.id;
      if (companyId) {
        try {
          await this.matchLink.recordInterest(
            employee.id,
            companyId,
            'employee',
          );
        } catch (linkError) {
          this.logger.warn(
            (linkError as Error).message ||
              'Could not record applicant interest',
          );
        }
      }

      /*
        The company was never told an application had arrived. Matching and
        interviews both notify; this was the one path in the service that
        wrote a row and left the other side to discover it by chance.
      */
      const companyUserId = job.company?.user?.id;
      if (companyUserId) {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: companyUserId,
            title: 'New application',
            message: `${employee.username || employee.firstname} applied for ${job.title}.`,
            type: 'application',
            data: {
              applicationId: saved.id,
              jobId: job.id,
              jobTitle: job.title,
              employeeId: employee.id,
              senderName: employee.username || employee.firstname,
              status: saved.status,
              eventType: 'application_received',
            },
            sendPush: true,
          },
        );
      }

      this.analyticsService.capture(
        employee.user?.id ?? employee.id,
        EAnalyticsEvent.APPLICATION_SUBMITTED,
        {
          application_id: saved.id,
          job_id: job.id,
          company_id: job.company?.id,
          has_cover_letter: !!saved.coverLetterNote,
        },
      );

      return new ApplyApplicationResponseDTO({
        id: saved.id,
        status: saved.status,
        coverLetterNote: saved.coverLetterNote ?? undefined,
        rejectionReason: saved.rejectionReason ?? null,
        reviewedAt: saved.reviewedAt ?? null,
        statusChangedAt: saved.statusChangedAt ?? null,
        appliedAt: saved.appliedAt,
        jobId: job.id,
        jobTitle: job.title,
        employeeId: employee.id,
      });
    } catch (error) {
      this.logger.error((error as Error).message || 'Error applying to job');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async getMyApplications(
    employeeId: string,
  ): Promise<GetApplicationResponseDTO[]> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { user: { id: employeeId } },
      });
      if (!employee)
        throw new RpcException({
          message: 'Employee not found',
          statusCode: 404,
        });

      const applications = await this.applicationRepo.find({
        where: { employee: { id: employee.id } },
        relations: ['job', 'job.company'],
        order: { appliedAt: 'DESC' },
      });

      return applications.map(
        (app) => new GetApplicationResponseDTO(this.toResponseFields(app)),
      );
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error fetching applications',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async getJobApplications(
    jobId: string,
    companyId: string,
  ): Promise<GetApplicationResponseDTO[]> {
    try {
      const job = await this.jobRepo.findOne({
        where: { id: jobId, company: { id: companyId } },
        relations: ['company'],
      });
      if (!job)
        throw new RpcException({
          message: 'Job not found or access denied',
          statusCode: 404,
        });

      const applications = await this.applicationRepo.find({
        where: { job: { id: jobId } },
        relations: ['employee', 'employee.user'],
        order: { appliedAt: 'DESC' },
      });

      /*
        Opening the list is what "reviewed" always meant, so stamp it here
        instead of waiting for a click that never came. One UPDATE over the
        rows that are still null, fired after the read so a stamping failure
        cannot cost the company their applicant list.
      */
      const unreviewed = applications
        .filter((app) => !app.reviewedAt)
        .map((app) => app.id);
      if (unreviewed.length) {
        const reviewedAt = new Date();
        try {
          await this.applicationRepo.update(
            { id: In(unreviewed), reviewedAt: IsNull() },
            { reviewedAt },
          );
          for (const app of applications) {
            if (!app.reviewedAt) app.reviewedAt = reviewedAt;
          }
        } catch (stampError) {
          this.logger.warn(
            (stampError as Error).message || 'Could not stamp reviewedAt',
          );
        }
      }

      /*
        The fit score is already computed for every (employee, company) pair the
        matching feed has scored, so the applicant list reuses it rather than
        recomputing. One query for the whole page instead of one per applicant —
        a flat list of names is an inbox; a scored one is a triage tool.
      */
      const scores = await this.matchScoresFor(
        applications.map((app) => app.employee?.id).filter(Boolean) as string[],
        companyId,
      );

      return applications.map(
        (app) =>
          new GetApplicationResponseDTO({
            ...this.toResponseFields(app),
            jobId,
            jobTitle: job.title,
            matchScore: app.employee?.id
              ? (scores.get(app.employee.id) ?? null)
              : null,
          }),
      );
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error fetching job applications',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async updateApplicationStatus(
    companyId: string,
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
  ): Promise<UpdateApplicationStatusResponseDTO> {
    try {
      const application = await this.applicationRepo.findOne({
        where: { id: updateApplicationStatusDTO.applicationId },
        relations: ['job', 'job.company', 'employee', 'employee.user'],
      });

      if (!application || application.job?.company?.id !== companyId) {
        throw new RpcException({
          message: 'Application not found or access denied',
          statusCode: 404,
        });
      }

      const nextStatus = updateApplicationStatusDTO.status;
      const allowed = APPLICATION_STATUS_TRANSITIONS[application.status] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw new RpcException({
          message: `Cannot move an application from "${application.status}" to "${nextStatus}".`,
          statusCode: 400,
        });
      }

      /*
        Shortlisting is the company saying yes, so it is the moment the pair
        becomes a match and chat and interviews unlock. Recorded *before* the
        stage is saved and allowed to throw: a shortlist whose match failed to
        write would read as progress while leaving the two sides unable to
        speak, which is the one outcome worse than an error.
      */
      if (nextStatus === EApplicationStatus.SHORTLISTED) {
        await this.matchLink.recordInterest(
          application.employee.id,
          companyId,
          'company',
        );
      }

      const previousStatus = application.status;
      application.status = nextStatus;
      application.statusChangedAt = new Date();
      // A reason belongs to a rejection. Carrying one onto any other status
      // would leave a stale explanation attached to a live application.
      application.rejectionReason =
        nextStatus === EApplicationStatus.REJECTED
          ? (updateApplicationStatusDTO.rejectionReason ?? null)
          : null;
      // Moving an application is itself proof the company looked at it.
      application.reviewedAt = application.reviewedAt ?? new Date();

      const updated = await this.applicationRepo.save(application);

      await this.logStatusChange(
        updated.id,
        previousStatus,
        nextStatus,
        application.job?.company?.user?.id ?? null,
        nextStatus === EApplicationStatus.REJECTED
          ? (updateApplicationStatusDTO.rejectionReason ?? null)
          : null,
      );

      this.analyticsService.capture(
        application.job?.company?.user?.id ??
          application.job?.company?.id ??
          'unknown',
        EAnalyticsEvent.APPLICATION_STATUS_CHANGED,
        {
          application_id: updated.id,
          from: previousStatus,
          to: nextStatus,
        },
      );

      const notice = APPLICATION_STATUS_NOTICE[nextStatus];
      const employeeUserId = application.employee?.user?.id;
      if (notice && employeeUserId) {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: employeeUserId,
            title: notice.title,
            message: notice.message(application.job?.title ?? 'a role'),
            type: 'application',
            data: {
              applicationId: updated.id,
              jobId: application.job?.id,
              jobTitle: application.job?.title,
              companyId,
              senderName: application.job?.company?.name,
              status: nextStatus,
              rejectionReason: updated.rejectionReason,
              eventType: `application_${nextStatus}`,
            },
            sendPush: true,
          },
        );
      }

      return new UpdateApplicationStatusResponseDTO(
        this.toResponseFields(updated),
      );
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error updating application status',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async withdrawApplication(
    employeeId: string,
    applicationId: string,
  ): Promise<{ message: string }> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { user: { id: employeeId } },
      });
      if (!employee)
        throw new RpcException({
          message: 'Employee not found',
          statusCode: 404,
        });

      const application = await this.applicationRepo.findOne({
        where: { id: applicationId, employee: { id: employee.id } },
        relations: ['job', 'job.company', 'job.company.user'],
      });

      if (!application) {
        throw new RpcException({
          message: 'Application not found or access denied',
          statusCode: 404,
        });
      }

      if (!WITHDRAWABLE_APPLICATION_STATUSES.includes(application.status)) {
        throw new RpcException({
          message: 'This application has already been closed',
          statusCode: 400,
        });
      }

      /*
        Was `applicationRepo.delete(applicationId)`. Deleting made every
        withdrawal invisible to the funnel — how many candidates dropped out,
        and from which stage, is exactly what a hiring pipeline is asked, and
        the answer was being thrown away on every call.
      */
      const withdrawnFrom = application.status;
      application.status = EApplicationStatus.WITHDRAWN;
      application.statusChangedAt = new Date();
      await this.applicationRepo.save(application);

      await this.logStatusChange(
        application.id,
        withdrawnFrom,
        EApplicationStatus.WITHDRAWN,
        employeeId,
        null,
      );

      this.analyticsService.capture(
        application.employee?.user?.id ?? application.employee?.id ?? 'unknown',
        EAnalyticsEvent.APPLICATION_WITHDRAWN,
        {
          application_id: application.id,
          from: withdrawnFrom,
        },
      );

      const companyUserId = application.job?.company?.user?.id;
      // Only worth telling the company if they had started working the
      // candidate; a withdrawal from PENDING is a row they never opened.
      if (companyUserId && withdrawnFrom !== EApplicationStatus.PENDING) {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: companyUserId,
            title: 'Application withdrawn',
            message: `${employee.username || employee.firstname} withdrew from ${application.job?.title ?? 'a role'}.`,
            type: 'application',
            data: {
              applicationId: application.id,
              jobId: application.job?.id,
              jobTitle: application.job?.title,
              employeeId: employee.id,
              senderName: employee.username || employee.firstname,
              status: EApplicationStatus.WITHDRAWN,
              withdrawnFrom,
              eventType: 'application_withdrawn',
            },
            sendPush: true,
          },
        );
      }

      return { message: 'Application withdrawn successfully' };
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error withdrawing application',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  /**
   * Move many applications to the same target stage in one call. Each row is
   * validated on its own against `APPLICATION_STATUS_TRANSITIONS`, so a
   * mixed selection (a HIRED row plus a PENDING one, aimed at REJECTED) is
   * partially applied rather than rejected wholesale — the recruiter sees
   * exactly which ones moved and which did not.
   *
   * Deliberately loops the single-row path rather than issuing one
   * cross-row UPDATE: the per-row work (match link on shortlist, per-row
   * notification, history entry, analytics) has to happen for each move, and
   * duplicating it in a batch shape would drift out of sync with the single
   * path.
   */
  async bulkUpdateApplicationStatus(
    companyId: string,
    bulkUpdateApplicationStatusDTO: BulkUpdateApplicationStatusDTO,
  ): Promise<BulkUpdateApplicationStatusResponseDTO> {
    const { applicationIds, status, rejectionReason } =
      bulkUpdateApplicationStatusDTO;
    const results: BulkUpdateApplicationStatusItemResultDTO[] = [];

    for (const applicationId of applicationIds) {
      try {
        const updated = await this.updateApplicationStatus(companyId, {
          applicationId,
          status,
          rejectionReason,
        });
        results.push(
          new BulkUpdateApplicationStatusItemResultDTO({
            applicationId,
            ok: true,
            status: updated.status,
            reason: null,
          }),
        );
      } catch (error) {
        const err = error as { message?: string; error?: { message?: string } };
        // RpcException wraps its payload in `.error`; the plain Error path
        // carries a top-level `.message`. Read both so a per-row failure is
        // legible regardless of source.
        const reason =
          err?.error?.message ??
          err?.message ??
          'Could not update this application';
        // Read the current status so the caller can show it as unchanged.
        let current = status;
        try {
          const row = await this.applicationRepo.findOne({
            where: { id: applicationId },
            select: { id: true, status: true },
          });
          if (row) current = row.status;
        } catch {
          // A read failure here is not worth surfacing; the message is enough.
        }
        results.push(
          new BulkUpdateApplicationStatusItemResultDTO({
            applicationId,
            ok: false,
            status: current,
            reason,
          }),
        );
      }
    }

    const updatedCount = results.filter((r) => r.ok).length;
    return new BulkUpdateApplicationStatusResponseDTO({
      results,
      updatedCount,
      failedCount: results.length - updatedCount,
    });
  }

  /**
   * The kanban read. Reuses `getJobApplications` so ownership, review-stamping
   * and match-score enrichment all happen in exactly one place, then buckets
   * by stage in `PIPELINE_COLUMN_ORDER`. Terminal statuses fall through: the
   * board is the live pipeline, not an audit view.
   */
  async getJobPipeline(
    jobId: string,
    companyId: string,
  ): Promise<JobPipelineResponseDTO> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId, company: { id: companyId } },
      select: { id: true, title: true },
    });
    if (!job) {
      throw new RpcException({
        message: 'Job not found or access denied',
        statusCode: 404,
      });
    }

    const applications = await this.getJobApplications(jobId, companyId);
    const byStatus = new Map<EApplicationStatus, GetApplicationResponseDTO[]>();
    for (const stage of PIPELINE_COLUMN_ORDER) {
      byStatus.set(stage, []);
    }
    for (const app of applications) {
      const bucket = byStatus.get(app.status);
      if (bucket) bucket.push(app);
    }

    return new JobPipelineResponseDTO({
      jobId: job.id,
      jobTitle: job.title,
      columns: PIPELINE_COLUMN_ORDER.map(
        (stage) =>
          new PipelineColumnDTO({
            status: stage,
            count: byStatus.get(stage)?.length ?? 0,
            applications: byStatus.get(stage) ?? [],
          }),
      ),
      totalCount: applications.length,
    });
  }

  async createApplicationNote(
    companyId: string,
    applicationId: string,
    createApplicationNoteDTO: CreateApplicationNoteDTO,
    authorUserId: string,
  ): Promise<ApplicationNoteResponseDTO> {
    try {
      const application = await this.loadOwnedApplication(
        applicationId,
        companyId,
      );

      const note = await this.noteRepo.save(
        this.noteRepo.create({
          application: { id: application.id } as Application,
          author: authorUserId ? ({ id: authorUserId } as User) : null,
          body: createApplicationNoteDTO.body.trim(),
        }),
      );

      // Reload so the response carries the author's display name in one
      // place — no second RPC hop for the drawer to render the byline.
      const saved = await this.noteRepo.findOne({
        where: { id: note.id },
        relations: ['author'],
      });

      return new ApplicationNoteResponseDTO({
        id: saved!.id,
        applicationId: application.id,
        body: saved!.body,
        createdAt: saved!.createdAt,
        authorId: saved!.author?.id ?? null,
        // The user table carries email but not a display name; a richer name
        // belongs to the employee/company profile on the read side. Email is
        // the stable identifier both roles have.
        authorName: saved!.author?.email ?? null,
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Error creating application note',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async listApplicationNotes(
    companyId: string,
    applicationId: string,
  ): Promise<ApplicationNoteResponseDTO[]> {
    await this.loadOwnedApplication(applicationId, companyId);

    const notes = await this.noteRepo.find({
      where: { application: { id: applicationId } },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });

    return notes.map(
      (note) =>
        new ApplicationNoteResponseDTO({
          id: note.id,
          applicationId,
          body: note.body,
          createdAt: note.createdAt,
          authorId: note.author?.id ?? null,
          authorName: note.author?.email ?? null,
        }),
    );
  }

  async deleteApplicationNote(
    companyId: string,
    applicationId: string,
    noteId: string,
  ): Promise<{ message: string }> {
    await this.loadOwnedApplication(applicationId, companyId);

    const note = await this.noteRepo.findOne({
      where: { id: noteId, application: { id: applicationId } },
    });
    if (!note) {
      throw new RpcException({
        message: 'Note not found',
        statusCode: 404,
      });
    }
    await this.noteRepo.remove(note);
    return { message: 'Note deleted' };
  }

  async listApplicationStatusHistory(
    companyId: string,
    applicationId: string,
  ): Promise<ApplicationStatusHistoryEntryDTO[]> {
    await this.loadOwnedApplication(applicationId, companyId);

    const rows = await this.historyRepo.find({
      where: { application: { id: applicationId } },
      relations: ['actor'],
      order: { createdAt: 'ASC' },
    });

    return rows.map(
      (row) =>
        new ApplicationStatusHistoryEntryDTO({
          id: row.id,
          applicationId,
          from: row.from,
          to: row.to,
          note: row.note,
          createdAt: row.createdAt,
          actorId: row.actor?.id ?? null,
          actorName: row.actor?.email ?? null,
        }),
    );
  }
}
