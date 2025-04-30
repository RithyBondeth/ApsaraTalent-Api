import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";
import { JwtService } from "@app/common/jwt/jwt.service";
import { EmailService } from "@app/common/email/email.service";
import { User } from "@app/common/database/entities/user.entity";
import { CompanyRegisterDTO } from "../dtos/company-register.dto";
import { EmployeeRegisterDTO } from "../dtos/employee-register.dto";
import { EUserRole } from "@app/common/database/enums/user-role.enum";
import { Skill } from "@app/common/database/entities/employee/skill.entity";
import { Experience } from "@app/common/database/entities/employee/experience.entity";
import { CareerScope } from "@app/common/database/entities/career-scope.entity";
import { Education } from "@app/common/database/entities/employee/education.entity";
import { Social } from "@app/common/database/entities/social.entity";
import { Employee } from "@app/common/database/entities/employee/employee.entity";
import { Company } from "@app/common/database/entities/company/company.entity";
import { Benefit } from "@app/common/database/entities/company/benefit.entity";
import { Value } from "@app/common/database/entities/company/value.entity";
import { Job } from "@app/common/database/entities/company/job.entity";
@Injectable()
export class RegisterService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
        @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
        @InjectRepository(Skill) private readonly skillRepository: Repository<Skill>,
        @InjectRepository(Experience) private readonly experienceRepository: Repository<Experience>,
        @InjectRepository(CareerScope) private readonly careerScopeRepository: Repository<CareerScope>,
        @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
        @InjectRepository(Education) private readonly educationRepository: Repository<Education>,
        @InjectRepository(Social) private readonly socialRepository: Repository<Social>,
        @InjectRepository(Benefit) private readonly benefitRepository: Repository<Benefit>,
        @InjectRepository(Value) private readonly valueRepository: Repository<Value>,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
        private readonly logger: PinoLogger
    ) {}

    async companyRegister(companyRegisterDTO: CompanyRegisterDTO) {        
        try {
            // Check if a company with this email already exists
            let company = await this.userRepository.findOne({ 
                where: { email: companyRegisterDTO.email },
                relations: ['company', 'company.openPositions', 'company.benefits', 'company.values', 'company.careerScopes', 'company.socials'],
            });
    
            // Generate email verification token
            const emailVerificationToken = await this.jwtService.generateEmailVerificationToken(companyRegisterDTO.email);
    
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
            const newJobs = companyRegisterDTO.jobs?.map((job) => {
                return this.jobRepository.create({
                    title: job.title,
                    description: job.description,
                    type: job.type,
                    experienceRequired: job.experienceRequired,
                    educationRequired: job.educationRequired,
                    skillsRequired: job.skillsRequired,
                    salary: job.salary,
                    expireDate: job.expireDate,
                    company: newCompany,
                });
            }) || [];
    
            // Create benefits and associate them with the company
            const newBenefits = companyRegisterDTO.benefits?.map((benefit) => {
                return this.benefitRepository.create({
                    label: benefit.label,
                    companies: [newCompany]
                });
            }) || []; 
    
            // Create values and associate them with the company
            const newValues = companyRegisterDTO.values?.map((value) => {
                return this.valueRepository.create({
                    label: value.label,
                    companies: [newCompany]
                });
            }) || [];
    
            // Create career scopes and associate them with the company
            const newCareerScopes = companyRegisterDTO.careerScopes?.map((career) => {
                return this.careerScopeRepository.create({
                    name: career.name,
                    description: career.description,
                    companies: [newCompany]
                });
            }) || [];
    
            // Create socials and associate them with the company
            const newSocials = companyRegisterDTO.socials?.map((social) => {
                return this.socialRepository.create({
                    platform: social.platform,
                    url: social.url,
                    company: newCompany
                });
            }) || [];
    
            // Save benefits, values, career scopes, and socials
            await this.jobRepository.save(newJobs);
            await this.benefitRepository.save(newBenefits);
            await this.valueRepository.save(newValues);
            await this.careerScopeRepository.save(newCareerScopes);
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
                emailVerificationToken: emailVerificationToken,
            });
            
            // Save user role company in database
            await this.userRepository.save(company);
    
            // Send verification email
            await this.emailService.sendEmail({
                to: company.email,
                subject: 'Apsara Talent - Verify Your Email Address',
                text: `Hello, ${company.company.name}. Please verify your email address by clicking on the following link: 
                       ${this.configService.get<string>("BASE_URL")}auth/verify-email/${emailVerificationToken}`,
            });
    
            // Return company profile
            return company;

        } catch (error) {
            // Handle error
            this.logger.error(error.message);  
            throw new BadRequestException("An error occurred while registering the user.");
        }
    }

    async employeeRegitser(employeeRegisterDTO: EmployeeRegisterDTO) {
        try {
            // Check if employee with this email already exists
            let employee = await this.userRepository.findOne({
                where: { email: employeeRegisterDTO.email },
                relations: ['employee', 'employee.skills', 'employee.experiences', 'employee.careerScopes', 'employee.socials', 'employee.educations']
            });

            // Generate email verification token
            const emailVerificationToken = await this.jwtService.generateEmailVerificationToken(employeeRegisterDTO.email);

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
            })

            // Save employee first to get the ID
            await this.employeeRepository.save(newEmployee);

            // Create education and associate them with the employee
            const newEducations = employeeRegisterDTO.educations?.map((edu) => {
                return this.educationRepository.create({
                    school: edu.school,
                    degree: edu.degree,
                    year: edu.year,
                    employee: newEmployee,
                });
            }) || [];
    
            // Create skills and associdate them with the employee
            const newSkills = employeeRegisterDTO.skills?.map((skill) => {
                return this.skillRepository.create({
                    name: skill.name,
                    description: skill.description,
                    employees: [newEmployee],
                });
            }) || [];

            // Create experinces and associdate them with the employee
            const newExperinces = employeeRegisterDTO.experiences?.map((exp) => {
                return this.experienceRepository.create({
                    title: exp.title,
                    description: exp.description,
                    startDate: exp.startDate,
                    endDate: exp.endDate,
                    employee: newEmployee,
                });
            }) || [];

            // Create careerScopes and associdate them with the employee
            const newCareerScopes = employeeRegisterDTO.careerScopes?.map((csp) => {
                return this.careerScopeRepository.create({
                    name: csp.name,
                    description: csp.description,
                    employees: [newEmployee],
                });
            }) || [];

            // Create socials and associdate them with the employee
            const newSocials = employeeRegisterDTO.socials?.map((social) => {
                return this.socialRepository.create({
                    platform: social.platform,
                    url: social.url,
                    employee: newEmployee,
                });
            }) || [];

            // Save educations, skills, experiences, career scopes, and socials
            await this.educationRepository.save(newEducations);
            await this.skillRepository.save(newSkills);
            await this.experienceRepository.save(newExperinces);
            await this.careerScopeRepository.save(newCareerScopes);
            await this.socialRepository.save(newSocials);

            // Update the employee entity with the new relations
            newEmployee.educations = newEducations;
            newEmployee.skills = newSkills;
            newEmployee.experiences = newExperinces;
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
                isEmailVerified: false,
                emailVerificationToken: emailVerificationToken,
            })

            // Save user role employee in database
            await this.userRepository.save(employee);

            // Send verification email
            await this.emailService.sendEmail({
                to: employee.email,
                subject: 'Apsara Talent - Verify Your Email Address',
                text: `Hello, ${employee.employee.username}. Please verify your email address by clicking on the following link: 
                       ${this.configService.get<string>("BASE_URL")}auth/verify-email/${emailVerificationToken}`,
            });

            // Return employee profile
            return employee;

        } catch (error) {
            // Handle error
            this.logger.error(error.message);  
            throw new BadRequestException("An error occurred while registering the user.");
        }
    }
}