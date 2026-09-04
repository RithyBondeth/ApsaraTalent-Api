import { resolveUserId } from '@app/common';
import { EmailService } from '@app/common/email/email.service';
import { ProblemReport } from '@app/common/database/entities/problem-report.entity';
import { User } from '@app/common/database/entities/user.entity';
import {
  ReportProblemDTO,
  ReportProblemResponseDTO,
} from '@app/contracts/dtos/user';
import { ISupportService } from '@app/contracts/interfaces/service/user-service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

@Injectable()
export class SupportService implements ISupportService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ProblemReport)
    private readonly reportRepo: Repository<ProblemReport>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SupportService.name);
  }

  /**
   * Where problem reports land. Falls back to the transport's own from-address
   * so a missing SUPPORT_EMAIL degrades to "mail ourselves" rather than
   * throwing away the report.
   */
  private get supportInbox(): string | undefined {
    return (
      this.configService.get<string>('email.support') ||
      this.configService.get<string>('email.from')
    );
  }

  /**
   * User-supplied text lands in an HTML email, so it has to be escaped or a
   * report containing markup would inject into the support inbox.
   */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async reportProblem(
    reportProblemDTO: ReportProblemDTO,
  ): Promise<ReportProblemResponseDTO> {
    const { category, details, pageUrl, userAgent } = reportProblemDTO;

    try {
      const reporterId = await this.resolveReporter(
        reportProblemDTO.reporterId,
      );

      const reporter = await this.userRepo.findOne({
        where: { id: reporterId },
        select: { id: true, email: true, role: true },
      });

      const inbox = this.supportInbox;
      if (!inbox) {
        this.logger.error(
          'No support inbox configured (email.support / email.from) — dropping problem report.',
        );
        throw new RpcException({
          statusCode: 500,
          message: 'An error occurred while submitting your report.',
        });
      }

      const lines = [
        `Category: ${category}`,
        `Reporter: ${reporter?.email ?? 'Unknown'} (${reporter?.role ?? 'Unknown'})`,
        `User ID: ${reporterId}`,
        `Page: ${pageUrl || 'Unknown'}`,
        `Browser: ${userAgent || 'Unknown'}`,
        `Reported at: ${new Date().toISOString()}`,
        '',
        'Details:',
        details,
      ];

      /*
        Row first, then email. The row is what the admin queue reads and
        what the admin dashboard was empty for; the email is the alert to
        SUPPORT_EMAIL. A row without an email delivery, or an email without a
        row, both still get the message to a human — but the row is what
        makes it findable a week later.
      */
      const saved = await this.reportRepo.save(
        this.reportRepo.create({
          reporter: reporter ? ({ id: reporter.id } as User) : null,
          category,
          details,
          pageUrl: pageUrl ?? null,
          userAgent: userAgent ?? null,
        }),
      );

      await this.emailService.sendEmail({
        to: inbox,
        // Replies from support go to the reporter, not to the noreply sender.
        replyTo: reporter?.email,
        subject: `[Problem Report ${saved.id.slice(0, 8)}] ${category} — ${reporter?.email ?? reporterId}`,
        text: lines.join('\n'),
        html: `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${this.escapeHtml(
          lines.join('\n'),
        )}</pre>`,
      });

      return new ReportProblemResponseDTO({
        message:
          'Thanks for the report. Our team will look into it as soon as possible.',
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        (error as Error).message || 'Failed to submit problem report.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while submitting your report.',
      });
    }
  }

  private async resolveReporter(id: string): Promise<string> {
    return resolveUserId(this.userRepo, id);
  }
}
