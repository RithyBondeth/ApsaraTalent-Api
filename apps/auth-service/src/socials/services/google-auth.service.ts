import { JwtService } from "@app/common/jwt/jwt.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { GoogleAuthDTO } from "../dtos/google-user.dto";
import { User } from "@app/common/database/entities/user.entiry";
import { IPayload } from "@app/common/jwt/interfaces/payload.interface";

@Injectable()
export class GoogleAuthService {
   constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger
   ) {}

   async googleLogin(googleData: GoogleAuthDTO) {
        try {
            //Find user by email 
            let user = await this.userRepository.findOne({ where: { email: googleData.email } });

            if(!user) {
                // Return data for role selection
                return {
                    newUser: true,
                    email: googleData.email,
                    firstname: googleData.firstName,
                    lastname: googleData.lastName,
                    picture: googleData.picture,
                    provider: 'google',
                }
            }

            //Generate JWT token for existing user
            const payload: IPayload = {
                id: user.id,
                email: user.email,
                role: user.role,
            }

            const [accessToken, refreshToken] = await Promise.all([
                this.jwtService.generateToken(payload),
                this.jwtService.generateRefreshToken(user.id),
            ]);

            return {
                message: "Successfully Logged in with Google",
                accessToken,
                refreshToken,
                user
            }  
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