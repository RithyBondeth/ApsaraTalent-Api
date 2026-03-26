import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { EmailService } from '@app/common/email/email.service';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CompanyResponseDTO,
  EmployeeResponseDTO,
  JobPositionDTO,
  UserResponseDTO,
} from 'apps/user-service/src/dtos/user-response.dto';
import { PinoLogger } from 'nestjs-pino';
import { DataSource, In, Repository } from 'typeorm';
import { CompanyRegisterDTO } from '../dtos/company-register.dto';
import { EmployeeRegisterDTO } from '../dtos/employee-register.dto';
@Injectable()
export class RegisterService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Experience)
    private readonly experienceRepository: Repository<Experience>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
    @InjectRepository(Education)
    private readonly educationRepository: Repository<Education>,
    @InjectRepository(Social)
    private readonly socialRepository: Repository<Social>,
    @InjectRepository(Benefit)
    private readonly benefitRepository: Repository<Benefit>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly logger: PinoLogger,
    private readonly dataSource: DataSource,
  ) {}

  // ── Helper: Bulk find-or-create for lookup entities ──────────────
  private async findOrCreateBenefits(
    labels: string[],
    queryRunner: import('typeorm').QueryRunner,
  ): Promise<Benefit[]> {
    if (!labels.length) return [];
    const existing = await queryRunner.manager.find(Benefit, {
      where: { label: In(labels) },
    });
    const existingLabels = new Set(existing.map((b) => b.label));
    const toCreate = labels
      .filter((l) => !existingLabels.has(l))
      .map((l) => queryRunner.manager.create(Benefit, { label: l }));
    const created = toCreate.length
      ? await queryRunner.manager.save(Benefit, toCreate)
      : [];
    return [...existing, ...created];
  }

  private async findOrCreateValues(
    labels: string[],
    queryRunner: import('typeorm').QueryRunner,
  ): Promise<Value[]> {
    if (!labels.length) return [];
    const existing = await queryRunner.manager.find(Value, {
      where: { label: In(labels) },
    });
    const existingLabels = new Set(existing.map((v) => v.label));
    const toCreate = labels
      .filter((l) => !existingLabels.has(l))
      .map((l) => queryRunner.manager.create(Value, { label: l }));
    const created = toCreate.length
      ? await queryRunner.manager.save(Value, toCreate)
      : [];
    return [...existing, ...created];
  }

  private async findOrCreateCareerScopes(
    names: string[],
    queryRunner: import('typeorm').QueryRunner,
  ): Promise<CareerScope[]> {
    if (!names.length) return [];
    const existing = await queryRunner.manager.find(CareerScope, {
      where: { name: In(names) },
    });
    const existingNames = new Set(existing.map((cs) => cs.name));
    const toCreate = names
      .filter((n) => !existingNames.has(n))
      .map((n) => queryRunner.manager.create(CareerScope, { name: n }));
    const created = toCreate.length
      ? await queryRunner.manager.save(CareerScope, toCreate)
      : [];
    return [...existing, ...created];
  }

  private async findOrCreateSkills(
    skills: { name: string; description?: string }[],
    queryRunner: import('typeorm').QueryRunner,
  ): Promise<Skill[]> {
    if (!skills.length) return [];
    const names = skills.map((s) => s.name);
    const existing = await queryRunner.manager.find(Skill, {
      where: { name: In(names) },
    });
    const existingNames = new Set(existing.map((s) => s.name));
    const toCreate = skills
      .filter((s) => !existingNames.has(s.name))
      .map((s) => queryRunner.manager.create(Skill, s));
    const created = toCreate.length
      ? await queryRunner.manager.save(Skill, toCreate)
      : [];
    return [...existing, ...created];
  }

  async companyRegister(companyRegisterDTO: CompanyRegisterDTO): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: UserResponseDTO;
  }> {
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

    // Generate email verification token in parallel with nothing blocking
    const emailVerificationToken =
      await this.jwtService.generateEmailVerificationToken(
        companyRegisterDTO.authEmail
          ? companyRegisterDTO.email
          : companyRegisterDTO.phone,
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
      });
      await queryRunner.manager.save(Company, newCompany);

      // ── Parallel: create all related entities at once ────────────
      const [newJobs, newBenefits, newValues, newCareerScopes, newSocials] =
        await Promise.all([
          // Jobs
          (async () => {
            const jobs =
              companyRegisterDTO.jobs?.map((job) =>
                queryRunner.manager.create(Job, {
                  ...job,
                  company: newCompany,
                }),
              ) || [];
            return jobs.length
              ? queryRunner.manager.save(Job, jobs)
              : [];
          })(),
          // Benefits — bulk find-or-create (1-2 queries instead of N)
          this.findOrCreateBenefits(
            companyRegisterDTO.benefits?.map((b) => b.label) || [],
            queryRunner,
          ),
          // Values — bulk find-or-create
          this.findOrCreateValues(
            companyRegisterDTO.values?.map((v) => v.label) || [],
            queryRunner,
          ),
          // Career scopes — bulk find-or-create
          this.findOrCreateCareerScopes(
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
        password: companyRegisterDTO.password,
        company: newCompany,
        isEmailVerified: false,
        emailVerificationToken: companyRegisterDTO.authEmail
          ? emailVerificationToken
          : null,
        profileCompleted: true,
      });
      await queryRunner.manager.save(User, company);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        (error as Error).message ||
          'An error occurred while registering company.',
      );
      throw new RpcException({
        message: (error as Error).message,
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
          subject: 'Apsara Talent - Verify Your Email Address',
          text: `Hello, ${company.company.name}. Please verify your email address by clicking on the following link:
          ${this.configService.get<string>('CLIENT_URL')}/login/email-verification/${emailVerificationToken}`,
        })
        .catch((err) =>
          this.logger.error(`Failed to send verification email: ${err.message}`),
        );
    }

    return {
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
            (job) => new JobPositionDTO(job),
          ),
        }),
      }),
    };
  }

  async employeeRegister(employeeRegisterDTO: EmployeeRegisterDTO): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: UserResponseDTO;
  }> {
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

    // Generate email verification token
    const emailVerificationToken =
      await this.jwtService.generateEmailVerificationToken(
        employeeRegisterDTO.authEmail
          ? employeeRegisterDTO.email
          : employeeRegisterDTO.phone,
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
          return edus.length
            ? queryRunner.manager.save(Education, edus)
            : [];
        })(),
        // Skills — bulk find-or-create (1-2 queries instead of N)
        this.findOrCreateSkills(
          employeeRegisterDTO.skills || [],
          queryRunner,
        ),
        // Experiences — always create new (unique per employee)
        (async () => {
          const exps =
            employeeRegisterDTO.experiences?.map((exp) =>
              queryRunner.manager.create(Experience, {
                ...exp,
                employee: newEmployee,
              }),
            ) || [];
          return exps.length
            ? queryRunner.manager.save(Experience, exps)
            : [];
        })(),
        // Career scopes — bulk find-or-create
        this.findOrCreateCareerScopes(
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
        password: employeeRegisterDTO.password,
        employee: newEmployee,
        isEmailVerified: employeeRegisterDTO.authEmail ? false : true,
        emailVerificationToken: employeeRegisterDTO.authEmail
          ? emailVerificationToken
          : null,
        profileCompleted: true,
      });
      await queryRunner.manager.save(User, employee);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        (error as Error).message ||
          'An error occurred while registering employee.',
      );
      throw new RpcException({
        message: (error as Error).message,
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
          subject: 'Apsara Talent - Verify Your Email Address',
          text: `Hello, ${employee.employee.username}. Please verify your email address by clicking on the following link:
          ${this.configService.get<string>('CLIENT_URL')}/login/email-verification/${emailVerificationToken}`,
        })
        .catch((err) =>
          this.logger.error(`Failed to send verification email: ${err.message}`),
        );
    }

    return {
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
                (job) => new JobPositionDTO(job),
              ),
            })
          : undefined,
      }),
    };
  }
}
