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
    UserResponseDTO
} from 'apps/user-service/src/dtos/user-response.dto';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
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
  ) {}

  async companyRegister(companyRegisterDTO: CompanyRegisterDTO): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: UserResponseDTO;
  }> {
    try {
      // Check if a company with this email already exists
      let company = await this.userRepository.findOne({
        where: companyRegisterDTO.authEmail
          ? { email: companyRegisterDTO.email }
          : { phone: companyRegisterDTO.phone },
        relations: [
          'company',
          'company.openPositions',
          'company.benefits',
          'company.values',
          'company.careerScopes',
          'company.socials',
        ],
      });

      if (company)
        throw new RpcException({
          message: 'This credential already registered!',
          statusCode: 401,
        });

      // Generate email verification token
      const emailVerificationToken =
        await this.jwtService.generateEmailVerificationToken(
          companyRegisterDTO.authEmail
            ? companyRegisterDTO.email
            : companyRegisterDTO.phone,
        );

      // Create company entity
      const newCompany = this.companyRepository.create({
        name: companyRegisterDTO.name,
        description: companyRegisterDTO.description,
        phone: companyRegisterDTO.phone,
        industry: companyRegisterDTO.industry,
        location: companyRegisterDTO.location,
        companySize: companyRegisterDTO.companySize,
        foundedYear: companyRegisterDTO.foundedYear,
      });

      // Save company first to get the ID
      await this.companyRepository.save(newCompany);

      // Create jobs and associate them with company
      const newJobs =
        companyRegisterDTO.jobs?.map((job) => {
          return this.jobRepository.create({
            ...job,
            company: newCompany,
          });
        }) || [];
      await this.jobRepository.save(newJobs);

      // Create or find existing benefits and associate them with the company
      const newBenefits = await Promise.all(
        companyRegisterDTO.benefits?.map(async (benefit) => {
          let existingBenefit = await this.benefitRepository.findOne({
            where: { label: benefit.label },
          });
          if (!existingBenefit) {
            existingBenefit = this.benefitRepository.create(benefit);
            await this.benefitRepository.save(existingBenefit);
          }
          return existingBenefit;
        }) || [],
      );

      // Create or find existing values and associate them with the company
      const newValues = await Promise.all(
        companyRegisterDTO.values?.map(async (value) => {
          let existingValue = await this.valueRepository.findOne({
            where: { label: value.label },
          });
          if (!existingValue) {
            existingValue = this.valueRepository.create(value);
            await this.valueRepository.save(existingValue);
          }
          return existingValue;
        }) || [],
      );

      // Create or find existing career scopes and associate them with the company
      const newCareerScopes = await Promise.all(
        companyRegisterDTO.careerScopes?.map(async (career) => {
          let existingCareerScope = await this.careerScopeRepository.findOne({
            where: { name: career.name },
          });
          if (!existingCareerScope) {
            existingCareerScope = this.careerScopeRepository.create(career);
            await this.careerScopeRepository.save(existingCareerScope);
          }
          return existingCareerScope;
        }) || [],
      );

      // Create socials and associate them with the company
      const newSocials =
        companyRegisterDTO.socials?.map((social) => {
          return this.socialRepository.create({
            ...social,
            company: newCompany,
          });
        }) || [];
      await this.socialRepository.save(newSocials);

      // Update the company entity with the new relations
      newCompany.openPositions = newJobs;
      newCompany.benefits = newBenefits;
      newCompany.values = newValues;
      newCompany.careerScopes = newCareerScopes;
      newCompany.socials = newSocials;

      // Save the updated company entity
      await this.companyRepository.save(newCompany);

      // Create user role company in database
      company = this.userRepository.create({
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

      // Save user role company in database
      await this.userRepository.save(company);

      // Send verification email
      if (companyRegisterDTO.authEmail) {
        await this.emailService.sendEmail({
          to: company.email,
          subject: 'Apsara Talent - Verify Your Email Address',
          text: `Hello, ${company.company.name}. Please verify your email address by clicking on the following link: 
          ${this.configService.get<string>('CLIENT_URL')}/login/email-verification/${emailVerificationToken}`,
        });
      }

      // Generate Tokens
      const payload: IPayload = {
        id: company.id,
        info: companyRegisterDTO.authEmail ? company.email : company.phone,
        role: company.role,
      };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(company.id),
      ]);

      // Return company profile
      return {
        message: companyRegisterDTO.authEmail
          ? 'Signup as company successfully. Please verify your email before login.'
          : 'Signup as company successfully.',
        accessToken: accessToken,
        refreshToken: refreshToken,
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
    } catch (error) {
      // Handle error
      this.logger.error(
        (error as Error).message ||
          'An error occurred while registering company.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async employeeRegister(employeeRegisterDTO: EmployeeRegisterDTO): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: UserResponseDTO;
  }> {
    try {
      // Check if employee with this email already exists
      let employee = await this.userRepository.findOne({
        where: employeeRegisterDTO.authEmail
          ? { email: employeeRegisterDTO.email }
          : { phone: employeeRegisterDTO.phone },
        relations: [
          'employee',
          'employee.skills',
          'employee.experiences',
          'employee.careerScopes',
          'employee.socials',
          'employee.educations',
        ],
      });

      if (employee)
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

      // Create employee entity
      const newEmployee = this.employeeRepository.create({
        firstname: employeeRegisterDTO.firstname,
        lastname: employeeRegisterDTO.lastname,
        username: employeeRegisterDTO.username,
        gender: employeeRegisterDTO.gender,
        job: employeeRegisterDTO.job,
        yearsOfExperience: employeeRegisterDTO.yearsOfExperience,
        availability: employeeRegisterDTO.availability,
        description: employeeRegisterDTO.description,
        location: employeeRegisterDTO.location,
        phone: employeeRegisterDTO.phone,
      });

      // Save employee first to get the ID
      await this.employeeRepository.save(newEmployee);

      // Create or find existing educations and associate them with the employee
      const newEducations = await Promise.all(
        employeeRegisterDTO.educations?.map(async (edu) => {
          let education = await this.educationRepository.findOne({
            where: { school: edu.school, degree: edu.degree, year: edu.year },
          });
          if (!education) {
            education = this.educationRepository.create({
              ...edu,
              employee: newEmployee,
            });
            await this.educationRepository.save(education);
          }
          return education;
        }) || [],
      );

      // Create or find existing skills and associate them with the employee
      const newSkills = await Promise.all(
        employeeRegisterDTO.skills?.map(async (skill) => {
          let existingSkill = await this.skillRepository.findOne({
            where: { name: skill.name },
          });
          if (!existingSkill) {
            existingSkill = this.skillRepository.create(skill);
            await this.skillRepository.save(existingSkill);
          }
          return existingSkill;
        }) || [],
      );

      // Create or find existing experiences and associate them with the employee
      const newExperiences = await Promise.all(
        employeeRegisterDTO.experiences?.map(async (exp) => {
          let experience = await this.experienceRepository.findOne({
            where: { title: exp.title, description: exp.description },
          });
          if (!experience) {
            experience = this.experienceRepository.create({
              ...exp,
              employee: newEmployee,
            });
            await this.experienceRepository.save(experience);
          }
          return experience;
        }) || [],
      );

      // Create or find existing career scopes and associate them with the employee
      const newCareerScopes = await Promise.all(
        employeeRegisterDTO.careerScopes?.map(async (csp) => {
          let careerScope = await this.careerScopeRepository.findOne({
            where: { name: csp.name },
          });
          if (!careerScope) {
            careerScope = this.careerScopeRepository.create(csp);
            await this.careerScopeRepository.save(careerScope);
          }
          return careerScope;
        }) || [],
      );

      // Create socials and related them with the employee
      const newSocials =
        employeeRegisterDTO.socials?.map((social) => {
          return this.socialRepository.create({
            platform: social.platform,
            url: social.url,
            employee: newEmployee,
          });
        }) || [];

      await this.socialRepository.save(newSocials);

      // Update the employee entity with the new relations
      newEmployee.educations = newEducations;
      newEmployee.skills = newSkills;
      newEmployee.experiences = newExperiences;
      newEmployee.careerScopes = newCareerScopes;
      newEmployee.socials = newSocials;

      // Save the updated employee entity
      await this.employeeRepository.save(newEmployee);

      // Create user role employee in database
      employee = this.userRepository.create({
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

      // Save user role employee in database
      await this.userRepository.save(employee);

      // Send verification email
      if (employeeRegisterDTO.authEmail)
        await this.emailService.sendEmail({
          to: employee.email,
          subject: 'Apsara Talent - Verify Your Email Address',
          text: `Hello, ${employee.employee.username}. Please verify your email address by clicking on the following link: 
          ${this.configService.get<string>('CLIENT_URL')}/login/email-verification/${emailVerificationToken}`,
        });

      // Generate Tokens
      const payload: IPayload = {
        id: employee.id,
        info: employeeRegisterDTO.authEmail ? employee.email : employee.phone,
        role: employee.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(employee.id),
      ]);

      // Return employee profile
      return {
        message: employeeRegisterDTO.authEmail
          ? 'Signup as employee successfully. Please verify your email before login.'
          : 'Signup as employee successfully.',
        accessToken: accessToken,
        refreshToken: refreshToken,
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
    } catch (error) {
      // Handle error
      this.logger.error(
        (error as Error).message ||
          'An error occurred while registering employee.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
