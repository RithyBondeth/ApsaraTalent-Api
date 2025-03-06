import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as path from "path";
import { UploadfileService } from "@app/common/uploadfile/uploadfile.service";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";
import { JwtService } from "@app/common/jwt/jwt.service";
import { EmailService } from "@app/common/email/email.service";
import { User } from "@app/common/database/entities/user.entiry";
import { CompanyRegisterDTO } from "../dtos/company-register.dto";
import { EmployeeRegisterDTO } from "../dtos/employee-register.dto";
import { EUserRole } from "@app/common/database/enums/user-role.enum";
import { Skill } from "@app/common/database/entities/employee/skill.entity";
import { Experience } from "@app/common/database/entities/employee/experince.entity";
import { CareerScope } from "@app/common/database/entities/career-scope.entity";
import { Education } from "@app/common/database/entities/employee/education.entity";
import { Social } from "@app/common/database/entities/social.entity";
import { Employee } from "@app/common/database/entities/employee/employee.entiry";
@Injectable()
export class RegisterService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
        @InjectRepository(Skill) private readonly skillRepository: Repository<Skill>,
        @InjectRepository(Experience) private readonly experienceRepository: Repository<Experience>,
        @InjectRepository(CareerScope) private readonly careerScopeRepository: Repository<CareerScope>,
        @InjectRepository(Education) private readonly educationRepository: Repository<Education>,
        @InjectRepository(Social) private readonly socialRepository: Repository<Social>,
        private readonly uploadFileService: UploadfileService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
        private readonly logger: PinoLogger
    ) {}

    async companyRegister(companyRegisterDTO: CompanyRegisterDTO) {
        try {
            //Find company by name if it exists
            let company = await this.userRepository.findOne({ 
                relations: ['company'],
                where: {
                    company: {
                        name: companyRegisterDTO.name,
                    }
                }
            })
            if(company) {
                //Clean up avatar and cover image if they exist
                if(companyRegisterDTO.avatar || companyRegisterDTO.cover) {
                    if(companyRegisterDTO.avatar) {
                        const avatarPath = path.join(process.cwd(), 'storage/auth-service/company-avatars', companyRegisterDTO.avatar.filename); 
                        UploadfileService.deleteFile(avatarPath, 'Company Avatar');     
                    }
                    if(companyRegisterDTO.cover) {
                        const coverPath = path.join(process.cwd(), 'storage/auth-service/company-covers', companyRegisterDTO.cover.filename); 
                        UploadfileService.deleteFile(coverPath, 'Company Cover');     
                    }
                }
                throw new NotFoundException(`Company with name ${companyRegisterDTO.name} is already registered`);
            }

            //Handle avatar and cover image
            let avatarImage = null;
            let coverImage = null;
            if(companyRegisterDTO.avatar || companyRegisterDTO.cover) {
                if(companyRegisterDTO.avatar) {
                    avatarImage = this.uploadFileService.getUploadFile('company-avatars', companyRegisterDTO.avatar);
                }

                if(companyRegisterDTO.cover) {
                    coverImage = this.uploadFileService.getUploadFile('company-covers', companyRegisterDTO.cover);
                } else {    
                    // Default cover image
                    // coverImage = this.configService.get<string>("BASE_URL") + this.configService.get<string>('DEFAULT_COMPANY_COVER');
                }
            }

            //Generate email verification token
            const emailVerificationToken = await this.jwtService.generateEmailVerificationToken(companyRegisterDTO.email);

            //Register company in database
            company = this.userRepository.create({
                company: {
                    name: companyRegisterDTO.name,
                    description: companyRegisterDTO.description,
                    avatar: avatarImage,
                    cover: coverImage,
                    industry: companyRegisterDTO.industry,
                    location: companyRegisterDTO.location,
                    companySize: companyRegisterDTO.companySize,
                    foundedYear: companyRegisterDTO.foundedYear,
                    benefits: companyRegisterDTO.benefits,
                    values: companyRegisterDTO.values,
                    careerScopes: companyRegisterDTO.careerScopes,
                    socials: companyRegisterDTO.socials,
                },  
                isEmailVerified: false,
                emailVerificationToken: emailVerificationToken,
            })
            
            //Save company in database
            await this.userRepository.save(company);

            //Send verification email
            await this.emailService.sendEmail({
                to: company.email,
                subject: 'Apsara Talent - Verify Your Email Address',
                text: `Hello, ${company.company.name}. Please verify your email address by clicking on the following link: 
                       ${this.configService.get<string>("BASE_URL")}auth/verify-email/${emailVerificationToken}`,
            });

            //Return company profile
            return company;
        } catch (error) {
            //Handle error
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
    
            if (employee) {
                if (employeeRegisterDTO.avatar) {
                    const avatarPath = path.join(process.cwd(), 'storage/auth-service/employee-avatars', employeeRegisterDTO.avatar.filename);
                    UploadfileService.deleteFile(avatarPath, 'Employee Avatar');     
                }
                throw new NotFoundException(`Employee with email ${employeeRegisterDTO.email} is already registered`);
            }
            
            // Handle avatar upload
            let avatarImage = null;
            if (employeeRegisterDTO.avatar) {
                avatarImage = this.uploadFileService.getUploadFile('employee-avatars', employeeRegisterDTO.avatar);
            }
    
            // Generate email verification token
            const emailVerificationToken = await this.jwtService.generateEmailVerificationToken(employeeRegisterDTO.email);
    
            // Create Employee entity
            const newEmployee = this.employeeRepository.create({
                firstname: employeeRegisterDTO.firstname,
                lastname: employeeRegisterDTO.lastname,
                username: employeeRegisterDTO.username,
                gender: employeeRegisterDTO.gender,
                avatar: avatarImage,
                job: employeeRegisterDTO.job,
                yearsOfExperience: employeeRegisterDTO.yearsOfExperience,
                availability: employeeRegisterDTO.availability,
                description: employeeRegisterDTO.description,
                location: employeeRegisterDTO.location,
                phone: employeeRegisterDTO.phone,
                educations: employeeRegisterDTO.educations?.map((edu) => this.educationRepository.create(edu)) || [],
                skills: employeeRegisterDTO.skills?.map((skill) => this.skillRepository.create(skill)) || [],
                experiences: employeeRegisterDTO.experiences?.map((exp) => this.experienceRepository.create(exp)) || [],
                careerScopes: employeeRegisterDTO.careerScopes?.map((scope) => this.careerScopeRepository.create(scope)) || [],
                socials: employeeRegisterDTO.socials?.map((social) => this.socialRepository.create(social)) || [],
            }); 

            //Save employee into database
            await this.employeeRepository.save(newEmployee);
    
            // Create User entity and link to Employee
            employee = this.userRepository.create({
                role: EUserRole.EMPLOYEE,
                email: employeeRegisterDTO.email,
                password: employeeRegisterDTO.password,
                employee: newEmployee,
                isEmailVerified: false,
                emailVerificationToken: emailVerificationToken,
            });
    
            // Save employee in database
            await this.userRepository.save(employee);
            
            // Send verification email
            await this.emailService.sendEmail({
                to: employee.email,
                subject: 'Apsara Talent - Verify Your Email Address',
                text: `Hello, ${employee.employee.firstname}. Please verify your email address by clicking on the following link: 
                       ${this.configService.get<string>("BASE_URL")}auth/verify-email/${emailVerificationToken}`,
            });
    
            // Return registered employee
            return employee;
    
        } catch (error) {
            this.logger.error(error.message);  
            throw new BadRequestException("An error occurred while registering the user.");
        }
    }
}