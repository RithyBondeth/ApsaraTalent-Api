import { User } from "@app/common/database/entities/user.entity";
import { JwtService } from "@app/common/jwt/jwt.service";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { GoogleAuthDTO } from "../dtos/google-user.dto";
import { EUserRole } from "@app/common/database/enums/user-role.enum";
import { GoogleAuthResponseDTO } from "../dtos/google-auth-response.dto";
import { RegisterReponseDTO } from "../../basic/dtos/register-response.dto";

@Injectable()
export class GoogleAuthService {
   constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger
   ) {}

   async googleLogin(googleData: GoogleAuthDTO) {
        try {
            // Check if user exists in the database with the provided Google ID
            let user = await this.userRepository.findOne({
                relations: ['profile'],
                where: { email: googleData.email, googleId: googleData.id }
            });
            if(!user) {
                // If not, create a new user
                user = this.userRepository.create({
                    firstname: googleData.firstName,
                    lastname: googleData.lastName,
                    username: googleData.email.split('@')[0],
                    email: googleData.email,
                    role: EUserRole.FREELANCER,
                    googleId: googleData.id,
                    profile: {
                        profile: googleData.picture,
                        careerScopes: [],
                        skills: [],
                    },
                });

                // Save user into database
                await this.userRepository.save(user);
                this.logger.info(`New user created from Google login: ${user.email}`);
            } else {
                // If user exists, update their profile picture
                user.googleId = googleData.firstName;
                user.firstname = googleData.firstName;
                user.lastname = googleData.lastName;
                user.profile.profile = googleData.picture;
            }

            // Generate Token
            const [accessToken, refreshToken] = await Promise.all([
                this.jwtService.generateToken({
                    id: user.id,
                    username: user.username,
                    role: user.role,
                }),
                this.jwtService.generateRefreshToken(user.id)
            ]);

            // Save refresh token
            user.refreshToken = refreshToken;
            await this.userRepository.save(user);

            // Return token and user details
            return new GoogleAuthResponseDTO({
                message: 'Successfully Logged in with Google',
                accessToken: accessToken,
                refreshToken: refreshToken,
                user: new RegisterReponseDTO(user),
            });
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
}