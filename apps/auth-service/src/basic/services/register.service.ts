import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { parseSkillList } from '@app/common/utils/skill.util';
import { User } from '@app/common/database/entities/user.entity';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { EmailService } from '@app/common/email/email.service';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import { buildOtpEmail, VerifyEmailService } from './verify-email.service';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CompanyResponseDTO,
  EmployeeResponseDTO,
  JobPositionResponseDTO,
  UserResponseDTO,
} from '@app/contracts/dtos/user';
import { PinoLogger } from 'nestjs-pino';
import { DataSource, Repository } from 'typeorm';
import { IRegisterService } from '@app/contracts/interfaces/service/auth-service.interface';
import {
  CompanyRegisterDTO,
  CompanyRegisterResponseDTO,
  EmployeeRegisterDTO,
  EmployeeRegisterResponseDTO,
} from '@app/contracts';
import {
  findOrCreateBenefits,
  findOrCreateCareerScopes,
  findOrCreateSkills,
  findOrCreateValues,
} from '../utils/reference-data.util';

@Injectable()
export class RegisterService implements IRegisterService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource,
  ) {}

  async companyRegister(
    companyRegisterDTO: CompanyRegisterDTO,
  ): Promise<CompanyRegisterResponseDTO> {
    // Lightweight existence check — no relations loaded
    const exists = await this.userRepository.exists({
      where: companyRegisterDTO.authEmail
        ? { email: companyRegisterDTO.email }
        : { phone: companyRegisterDTO.phone },
    });

    if (exists)
      throw new RpcException({
        message: 'This credential already registered!',
        statusCode: 401,
      });

    // A six-digit code, not a signed link — see VerifyEmailService for why.
    const emailVerificationOtp = VerifyEmailService.generateOtp();
    const emailVerificationOtpExpires = new Date(
      Date.now() + AUTH.EMAIL_OTP_EXPIRY,
    );

    // ── Transaction: all DB writes are atomic ──────────────────────
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let company: User;

    try {
      // Create and save company entity
      const newCompany = queryRunner.manager.create(Company, {
        name: companyRegisterDTO.name,
        description: companyRegisterDTO.description,
        phone: companyRegisterDTO.phone,
        industry: companyRegisterDTO.industry,
        location: companyRegisterDTO.location,
        companySize: companyRegisterDTO.companySize,
        foundedYear: companyRegisterDTO.foundedYear,
        websiteUrl: companyRegisterDTO.websiteUrl ?? null,
        companyType: companyRegisterDTO.companyType ?? null,
      });
      await queryRunner.manager.save(Company, newCompany);

      // ── Parallel: create all related entities at once ────────────
      const [newJobs, newBenefits, newValues, newCareerScopes, newSocials] =
        await Promise.all([
          // Jobs — each one's required skills are resolved onto the shared
          // `skill` table, the same rows employees are tagged with. The legacy
          // `skillsRequired` string is written too until a later release drops
          // it (see JobSkillsRelation migration).
          (async () => {
            const submitted = companyRegisterDTO.jobs ?? [];
            if (!submitted.length) return [];

            // One find-or-create for every job's skills at once, rather than
            // one round trip per position.
            const allSkillNames = submitted.flatMap((job) =>
              parseSkillList(job.skillsRequired),
            );
            const skillRows = await findOrCreateSkills(
              [...new Set(allSkillNames)].map((name) => ({ name })),
              queryRunner,
            );
            const skillByName = new Map(
              skillRows.map((skill) => [skill.name, skill]),
            );

            const jobs = submitted.map((job) =>
              queryRunner.manager.create(Job, {
                ...job,
                company: newCompany,
                requiredSkills: parseSkillList(job.skillsRequired)
                  .map((name) => skillByName.get(name))
                  .filter((skill): skill is Skill => Boolean(skill)),
              }),
            );
            return queryRunner.manager.save(Job, jobs);
          })(),
          // Benefits — bulk find-or-create (1-2 queries instead of N)
          findOrCreateBenefits(
            companyRegisterDTO.benefits?.map((b) => b.label) || [],
            queryRunner,
          ),
          // Values — bulk find-or-create
          findOrCreateValues(
            companyRegisterDTO.values?.map((v) => v.label) || [],
            queryRunner,
          ),
          // Career scopes — bulk find-or-create
          findOrCreateCareerScopes(
            companyRegisterDTO.careerScopes?.map((c) => c.name) || [],
            queryRunner,
          ),
          // Socials
          (async () => {
            const socials =
              companyRegisterDTO.socials?.map((social) =>
                queryRunner.manager.create(Social, {
                  ...social,
                  company: newCompany,
                }),
              ) || [];
            return socials.length
              ? queryRunner.manager.save(Social, socials)
              : [];
          })(),
        ]);

      // Update company relations in a single save
      newCompany.openPositions = newJobs;
      newCompany.benefits = newBenefits;
      newCompany.values = newValues;
      newCompany.careerScopes = newCareerScopes;
      newCompany.socials = newSocials;
      await queryRunner.manager.save(Company, newCompany);

      // Create user
      company = queryRunner.manager.create(User, {
        role: EUserRole.COMPANY,
        email: companyRegisterDTO.email,
        phone: companyRegisterDTO.phone,
        password: companyRegisterDTO.password,
        company: newCompany,
        isEmailVerified: false,
        emailVerificationOtp: companyRegisterDTO.authEmail
          ? emailVerificationOtp
          : null,
        emailVerificationOtpExpires: companyRegisterDTO.authEmail
          ? emailVerificationOtpExpires
          : null,
        profileCompleted: true,
      });
      await queryRunner.manager.save(User, company);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message =
        (error as Error)?.message ||
        'An error occurred while registering company.';
      this.logger.error(message);
      throw new RpcException({
        message,
        statusCode: 500,
      });
    } finally {
      await queryRunner.release();
    }

    // ── Non-blocking: email + tokens in parallel ───────────────────
    const payload: IPayload = {
      id: company.id,
      info: companyRegisterDTO.authEmail ? company.email : company.phone,
      role: company.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.generateToken(payload),
      this.jwtService.generateRefreshToken(company.id),
    ]);

    // Fire-and-forget: don't block response for email delivery
    if (companyRegisterDTO.authEmail) {
      this.emailService
        .sendEmail({
          to: company.email,
          subject: 'Apsara Talent - Your verification code',
          text: buildOtpEmail(emailVerificationOtp),
        })
        .catch((err) =>
          this.logger.error(
            `Failed to send verification email: ${err.message}`,
          ),
        );
    }

    return new CompanyRegisterResponseDTO({
      message: companyRegisterDTO.authEmail
        ? 'Signup as company successfully. Please verify your email before login.'
        : 'Signup as company successfully.',
      accessToken,
      refreshToken,
      user: new UserResponseDTO({
        ...company,
        employee: company.employee
          ? new EmployeeResponseDTO({
              ...company.employee,
              userId: company.id,
            })
          : undefined,
        company: new CompanyResponseDTO({
          ...company.company,
          openPositions: company.company.openPositions?.map(
            (job) => new JobPositionResponseDTO(job),
          ),
        }),
      }),
    });
  }

  async employeeRegister(
    employeeRegisterDTO: EmployeeRegisterDTO,
  ): Promise<EmployeeRegisterResponseDTO> {
    // Lightweight existence check — no relations loaded
    const exists = await this.userRepository.exists({
      where: employeeRegisterDTO.authEmail
        ? { email: employeeRegisterDTO.email }
        : { phone: employeeRegisterDTO.phone },
    });

    if (exists)
      throw new RpcException({
        message: 'This credential already registered!',
        statusCode: 401,
      });

    // A six-digit code, not a signed link — see VerifyEmailService for why.
    const emailVerificationOtp = VerifyEmailService.generateOtp();
    const emailVerificationOtpExpires = new Date(
      Date.now() + AUTH.EMAIL_OTP_EXPIRY,
    );

    // ── Transaction: all DB writes are atomic ──────────────────────
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let employee: User;

    try {
      // Create and save employee entity
      const newEmployee = queryRunner.manager.create(Employee, {
        firstname: employeeRegisterDTO.firstname,
        lastname: employeeRegisterDTO.lastname,
        dob: employeeRegisterDTO.dob,
        username: employeeRegisterDTO.username,
        gender: employeeRegisterDTO.gender,
        job: employeeRegisterDTO.job,
        yearsOfExperience: employeeRegisterDTO.yearsOfExperience,
        availability: employeeRegisterDTO.availability,
        description: employeeRegisterDTO.description,
        location: employeeRegisterDTO.location,
        phone: employeeRegisterDTO.phone,
        workMode: employeeRegisterDTO.workMode ?? null,
        noticePeriod: employeeRegisterDTO.noticePeriod ?? null,
        portfolioUrl: employeeRegisterDTO.portfolioUrl ?? null,
        linkedinUrl: employeeRegisterDTO.linkedinUrl ?? null,
        languages: employeeRegisterDTO.languages ?? null,
        expectedSalaryMin: employeeRegisterDTO.expectedSalaryMin ?? null,
        expectedSalaryMax: employeeRegisterDTO.expectedSalaryMax ?? null,
      });
      await queryRunner.manager.save(Employee, newEmployee);

      // ── Parallel: create all related entities at once ────────────
      const [
        newEducations,
        newSkills,
        newExperiences,
        newCareerScopes,
        newSocials,
      ] = await Promise.all([
        // Educations — always create new (unique per employee)
        (async () => {
          const edus =
            employeeRegisterDTO.educations?.map((edu) =>
              queryRunner.manager.create(Education, {
                ...edu,
                employee: newEmployee,
              }),
            ) || [];
          return edus.length ? queryRunner.manager.save(Education, edus) : [];
        })(),
        // Skills — bulk find-or-create (1-2 queries instead of N)
        findOrCreateSkills(employeeRegisterDTO.skills || [], queryRunner),
        // Experiences — always create new (unique per employee)
        (async () => {
          const exps =
            employeeRegisterDTO.experiences?.map((exp) =>
              queryRunner.manager.create(Experience, {
                ...exp,
                employee: newEmployee,
              }),
            ) || [];
          return exps.length ? queryRunner.manager.save(Experience, exps) : [];
        })(),
        // Career scopes — bulk find-or-create
        findOrCreateCareerScopes(
          employeeRegisterDTO.careerScopes?.map((c) => c.name) || [],
          queryRunner,
        ),
        // Socials
        (async () => {
          const socials =
            employeeRegisterDTO.socials?.map((social) =>
              queryRunner.manager.create(Social, {
                platform: social.platform,
                url: social.url,
                employee: newEmployee,
              }),
            ) || [];
          return socials.length
            ? queryRunner.manager.save(Social, socials)
            : [];
        })(),
      ]);

      // Update employee relations in a single save
      newEmployee.educations = newEducations;
      newEmployee.skills = newSkills;
      newEmployee.experiences = newExperiences;
      newEmployee.careerScopes = newCareerScopes;
      newEmployee.socials = newSocials;
      await queryRunner.manager.save(Employee, newEmployee);

      // Create user
      employee = queryRunner.manager.create(User, {
        role: EUserRole.EMPLOYEE,
        email: employeeRegisterDTO.email,
        phone: employeeRegisterDTO.phone,
        password: employeeRegisterDTO.password,
        employee: newEmployee,
        isEmailVerified: employeeRegisterDTO.authEmail ? false : true,
        emailVerificationOtp: employeeRegisterDTO.authEmail
          ? emailVerificationOtp
          : null,
        emailVerificationOtpExpires: employeeRegisterDTO.authEmail
          ? emailVerificationOtpExpires
          : null,
        profileCompleted: true,
      });
      await queryRunner.manager.save(User, employee);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message =
        (error as Error)?.message ||
        'An error occurred while registering employee.';
      this.logger.error(message);
      throw new RpcException({
        message,
        statusCode: 500,
      });
    } finally {
      await queryRunner.release();
    }

    // ── Non-blocking: email + tokens in parallel ───────────────────
    const payload: IPayload = {
      id: employee.id,
      info: employeeRegisterDTO.authEmail ? employee.email : employee.phone,
      role: employee.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.generateToken(payload),
      this.jwtService.generateRefreshToken(employee.id),
    ]);

    // Fire-and-forget: don't block response for email delivery
    if (employeeRegisterDTO.authEmail) {
      this.emailService
        .sendEmail({
          to: employee.email,
          subject: 'Apsara Talent - Your verification code',
          text: buildOtpEmail(emailVerificationOtp),
        })
        .catch((err) =>
          this.logger.error(
            `Failed to send verification email: ${err.message}`,
          ),
        );
    }

    return new EmployeeRegisterResponseDTO({
      message: employeeRegisterDTO.authEmail
        ? 'Signup as employee successfully. Please verify your email before login.'
        : 'Signup as employee successfully.',
      accessToken,
      refreshToken,
      user: new UserResponseDTO({
        ...employee,
        employee: new EmployeeResponseDTO({
          ...employee.employee,
          userId: employee.id,
        }),
        company: employee.company
          ? new CompanyResponseDTO({
              ...employee.company,
              openPositions: employee.company.openPositions?.map(
                (job) => new JobPositionResponseDTO(job),
              ),
            })
          : undefined,
      }),
    });
  }
}
