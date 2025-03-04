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
@Injectable()
export class RegisterService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
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
            //Find employee by email if it exists
            let employee = await this.userRepository.findOne({
                where: {
                    email: employeeRegisterDTO.email
                },
                relations: ['employee']
            })
            if(employee) {
                if(employeeRegisterDTO.avatar) {
                    const avatarPath = path.join(process.cwd(), 'storage/auth-service/employee-avatars', employeeRegisterDTO.avatar.filename); 
                    UploadfileService.deleteFile(avatarPath, 'Employee Avatar');     
                }
                throw new NotFoundException(`Employee with email ${employeeRegisterDTO.email} is already registered`);
            }
            
            //Handle avatar image
            let avatarImage = null;
            if(employeeRegisterDTO.avatar) {
                avatarImage = this.uploadFileService.getUploadFile('employee-avatars', employeeRegisterDTO.avatar);
            }

            //Generate email verification token
            const emailVerificationToken = await this.jwtService.generateEmailVerificationToken(employeeRegisterDTO.email);

            //Register employee in database
            employee = this.userRepository.create({
                employee: {
                    firstname: employeeRegisterDTO.firstname,
                    lastname: employeeRegisterDTO.lastname,
                    username: employeeRegisterDTO.username,
                    avatar: avatarImage,
                },
                isEmailVerified: false,
                emailVerificationToken: emailVerificationToken,
            })

            //Save employee in database
            await this.userRepository.save(employee);
            
            //Send verification email
            await this.emailService.sendEmail({
                to: employee.email,
                subject: 'Apsara Talent - Verify Your Email Address',
                text: `Hello, ${employee.employee.firstname}. Please verify your email address by clicking on the following link: 
                       ${this.configService.get<string>("BASE_URL")}auth/verify-email/${emailVerificationToken}`,
            });

            //Return employee profile
            return employee;
        } catch (error) {
            //Handle error
            this.logger.error(error.message);  
            throw new BadRequestException("An error occurred while registering the user.");
        }
    }
}