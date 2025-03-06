import { JwtService } from "@app/common/jwt/jwt.service";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { IPayload } from "@app/common/jwt/interfaces/payload.interface";
import { User } from "@app/common/database/entities/user.entiry";
import { Employee } from "@app/common/database/entities/employee/employee.entiry";
import { EUserRole } from "@app/common/database/enums/user-role.enum";
import { Company } from "@app/common/database/entities/company/company.entity";
import { RegisterGoogleUserDTO } from "../dtos/google-register-user.dto";
import { Skill } from "@app/common/database/entities/employee/skill.entity";
import { CareerScope } from "@app/common/database/entities/career-scope.entity";
import { Social } from "@app/common/database/entities/social.entity";
import { Value } from "@app/common/database/entities/company/value.entity";
import { Benefit } from "@app/common/database/entities/company/benefit.entity";
import { GoogleAuthDTO } from "../dtos/google-user.dto";

@Injectable()
export class GoogleAuthService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
        @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
        @InjectRepository(Skill) private readonly skillRepository: Repository<Skill>,
        @InjectRepository(CareerScope) private readonly careerScopeRepository: Repository<CareerScope>,
        @InjectRepository(Social) private readonly socialRepository: Repository<Social>,
        @InjectRepository(Value) private readonly valueRepository: Repository<Value>,
        @InjectRepository(Benefit) private readonly benefitRepository: Repository<Benefit>,
        private readonly jwtService: JwtService,
        private readonly logger: PinoLogger
    ) {}

    async googleLogin(googleData: GoogleAuthDTO) {
        try {
            // Find user by email
            let user = await this.userRepository.findOne({ where: { email: googleData.email } });

            if (!user) {
                // If user does not exist, return data for frontend role selection
                return {
                    newUser: true,
                    email: googleData.email,
                    firstname: googleData.firstName,
                    lastname: googleData.lastName,
                    picture: googleData.picture,
                    provider: 'google',
                };
            }

            // Check if user is an Employee or Company
            let userProfile = null;
            if (user.role === EUserRole.EMPLOYEE) {
                userProfile = await this.employeeRepository.findOne({ 
                    where: { user }, 
                    relations: ['skills', 'careerScopes', 'socials']
                });
            } else if (user.role === EUserRole.COMPANY) {
                userProfile = await this.companyRepository.findOne({ 
                    where: { user }, 
                    relations: ['benefits', 'values', 'careerScopes', 'socials'] 
                });
            }

            // Generate JWT tokens
            const payload: IPayload = {
                id: user.id,
                email: user.email,
                role: user.role,
            };

            const [accessToken, refreshToken] = await Promise.all([
                this.jwtService.generateToken(payload),
                this.jwtService.generateRefreshToken(user.id),
            ]);

            return {
                message: "Successfully Logged in with Google",
                accessToken,
                refreshToken,
                user,
                profile: userProfile
            };
        } catch (error) {
            this.logger.error('Google login error:', {
                error: error.message,
                stack: error.stack,
                googleId: googleData.id,
                email: googleData.email
            });
            throw new UnauthorizedException('Failed to authenticate with Google');
        }
    }


    async registerGoogleUser(registerGoogleUser: RegisterGoogleUserDTO) {
        try {
            const { role, employeeData, companyData } = registerGoogleUser;
            let user = await this.userRepository.findOne({ where: { email: employeeData?.email || companyData?.email } });
    
            if (user) throw new BadRequestException("User already exists");
    
            // Create User in Database
            user = this.userRepository.create({
                email: employeeData?.email || companyData?.email,
                role,
                googleId: employeeData?.email || companyData?.email,
            });
            await this.userRepository.save(user);
    
            let profile = null;
    
            if (role === EUserRole.EMPLOYEE && employeeData) {
                // Directly insert employee details
                profile = this.employeeRepository.create({
                    user,
                    username: employeeData.username,
                    job: employeeData.job,
                    location: employeeData.location,
                    phone: employeeData.phone,
                    availability: employeeData.availability,
                    description: employeeData.description,
                    yearsOfExperience: employeeData.yearsOfExperience,
                    skills: employeeData.skills?.map((skill) => this.skillRepository.create(skill)) || [],
                    careerScopes: employeeData.careerScopes?.map((career) => this.careerScopeRepository.create(career)) || [],
                    socials: employeeData.socials?.map(social => this.socialRepository.create(social)) || [],
                });
                await this.employeeRepository.save(profile);
            } 
            
            else if (role === EUserRole.COMPANY && companyData) {
                // Directly insert company details
                profile = this.companyRepository.create({
                    user,
                    name: companyData.name,
                    description: companyData.description,
                    industry: companyData.industry,
                    location: companyData.location,
                    companySize: companyData.companySize,
                    foundedYear: companyData.foundedYear,
                    benefits: companyData.benefits?.map((benefit) => this.benefitRepository.create(benefit)) || [],
                    values: companyData.values?.map((value) => this.valueRepository.create(value)) || [],
                    careerScopes: companyData.careerScopes?.map((career) => this.careerScopeRepository.create(career)) || [],
                    socials: companyData.socials?.map((social) => this.socialRepository.create(social)) || [],
                });
                await this.companyRepository.save(profile);
            }
    
            // Generate JWT tokens
            const payload: IPayload = { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            };
            const [accessToken, refreshToken] = await Promise.all([
                this.jwtService.generateToken(payload),
                this.jwtService.generateRefreshToken(user.id)
            ]);
    
            return {
                message: "Registration successful",
                accessToken,
                refreshToken,
                user,
                profile
            };
        } catch (error) {
            this.logger.error('Google register profile error:', { error: error.message });
            throw new UnauthorizedException('Failed to register profile with Google');
        }
    } 
}