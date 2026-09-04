import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { SupportService } from './support.service';
import { User } from '@app/common/database/entities/user.entity';
import { ProblemReport } from '@app/common/database/entities/problem-report.entity';
import { EmailService } from '@app/common/email/email.service';
import { resolveUserId } from '@app/common';
import { PinoLogger } from 'nestjs-pino';
import { ReportProblemDTO } from '@app/contracts/dtos/user';
import { EProblemCategory } from '@app/common/database/enums/problem-category.enum';

jest.mock('@app/common', () => ({
  ...jest.requireActual('@app/common'),
  resolveUserId: jest.fn(),
}));

describe('SupportService', () => {
  let service: SupportService;
  let userRepo: any;
  let reportRepo: any;
  let emailService: any;
  let configService: any;
  let logger: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
    };
    reportRepo = {
      create: jest.fn((values) => values),
      save: jest.fn(async (row) => ({ id: 'report-1', ...row })),
    };
    emailService = {
      sendEmail: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    };
    logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(ProblemReport), useValue: reportRepo },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(logger.setContext).toHaveBeenCalledWith(SupportService.name);
  });

  describe('reportProblem', () => {
    const mockDto: ReportProblemDTO = {
      reporterId: 'user-1',
      category: EProblemCategory.BUG,
      details: 'This is a test <script>alert(1)</script>',
      pageUrl: '/home',
      userAgent: 'Chrome',
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'employer',
    };

    beforeEach(() => {
      (resolveUserId as jest.Mock).mockResolvedValue('user-1');
      configService.get.mockImplementation((key: string) => {
        if (key === 'email.support') return 'support@apsara.com';
        return null;
      });
      userRepo.findOne.mockResolvedValue(mockUser);
    });

    it('should successfully submit a problem report and send an email', async () => {
      const result = await service.reportProblem(mockDto);

      expect(result.message).toEqual(
        'Thanks for the report. Our team will look into it as soon as possible.',
      );

      expect(resolveUserId).toHaveBeenCalledWith(userRepo, 'user-1');
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true, email: true, role: true },
      });

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'support@apsara.com',
        replyTo: 'test@example.com',
        subject: '[Problem Report report-1] bug — test@example.com',
        text: expect.stringContaining('Category: bug'),
        html: expect.stringContaining('&lt;script&gt;alert(1)&lt;/script&gt;'),
      });
      // The whole reason this row exists: the admin queue reads it. A row
      // without an email would still be findable in the panel; an email
      // without a row is invisible to anyone but the SUPPORT_EMAIL inbox.
      expect(reportRepo.save).toHaveBeenCalled();
      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: EProblemCategory.BUG,
          details: mockDto.details,
          pageUrl: '/home',
          userAgent: 'Chrome',
        }),
      );

      // Verify escaping worked correctly
      const call = emailService.sendEmail.mock.calls[0][0];
      expect(call.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(call.html).not.toContain('<script>');
    });

    it('should fallback to email.from if email.support is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'email.support') return null;
        if (key === 'email.from') return 'noreply@apsara.com';
        return null;
      });

      await service.reportProblem(mockDto);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'noreply@apsara.com' }),
      );
    });

    it('should throw an RpcException if no support inbox is configured', async () => {
      configService.get.mockReturnValue(null); // No support, no from

      await expect(service.reportProblem(mockDto)).rejects.toThrow(
        RpcException,
      );
      await expect(service.reportProblem(mockDto)).rejects.toThrow(
        'An error occurred while submitting your report.',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'No support inbox configured (email.support / email.from) — dropping problem report.',
      );
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle missing reporter details robustly', async () => {
      userRepo.findOne.mockResolvedValue(null); // User not found

      const mockDtoMissing: ReportProblemDTO = {
        reporterId: 'user-1',
        category: EProblemCategory.BUG,
        details: 'Issue without browser or page',
      };

      await service.reportProblem(mockDtoMissing);

      const call = emailService.sendEmail.mock.calls[0][0];
      expect(call.replyTo).toBeUndefined();
      expect(call.subject).toBe('[Problem Report report-1] bug — user-1');
      expect(call.text).toContain('Reporter: Unknown (Unknown)');
      expect(call.text).toContain('Page: Unknown');
      expect(call.text).toContain('Browser: Unknown');
    });

    it('should re-throw if a known RpcException is caught', async () => {
      const knownError = new RpcException('Known business exception');
      userRepo.findOne.mockRejectedValue(knownError);

      await expect(service.reportProblem(mockDto)).rejects.toThrow(knownError);
      expect(logger.error).not.toHaveBeenCalledWith('Known business exception'); // logger error only happens for unknown ones
    });

    it('should log and throw generic RpcException for unknown errors', async () => {
      userRepo.findOne.mockRejectedValue(new Error('Database offline'));

      await expect(service.reportProblem(mockDto)).rejects.toThrow(
        RpcException,
      );
      await expect(service.reportProblem(mockDto)).rejects.toThrow(
        'An error occurred while submitting your report.',
      );

      expect(logger.error).toHaveBeenCalledWith('Database offline');
    });

    it('should fallback to default error message if error has no message', async () => {
      userRepo.findOne.mockRejectedValue('String error');

      await expect(service.reportProblem(mockDto)).rejects.toThrow(
        RpcException,
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to submit problem report.',
      );
    });
  });
});
