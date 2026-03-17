<<<<<<< HEAD
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
=======
import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { GoogleAuthDTO } from '../dtos/google-auth.dto';

@Injectable()
export class GoogleAuthService {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async googleLogin(googleData: GoogleAuthDTO) {
    try {
      // Find a user by email
      const user = await this.userRepository.findOne({
        where: { email: googleData.email },
      });

      if (!user) {
        // If user does not exist, return data for frontend role selection
        return {
          message: 'Successfully Logged in with Google',
          newUser: true,
          email: googleData.email,
          firstname: googleData.firstName,
          lastname: googleData.lastName,
          picture: googleData.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'google',
        };
      }

      // Update user with googleId and login tracking if not already set
      if (!user.googleId && googleData.id) {
        user.googleId = googleData.id;
      }
      user.lastLoginMethod = ELoginMethod.GOOGLE;
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      // Generate JWT tokens
      const payload: IPayload = {
        id: user.id,
        info: user.email,
        role: user.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      // Clear Cache in USER SERVICE
      console.log('[AUTH] sending CLEAR_USER_CACHE from GOOGLE LOGIN', user.id);
      await firstValueFrom(
        this.userClient.send(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE, {
          userId: user.id,
        }),
      );

      return {
        message: 'Successfully Logged in with Google',
        newUser: false,
        email: null,
        firstname: null,
        lastname: null,
        picture: null,
        provider: null,
        lastLoginMethod: user.lastLoginMethod,
        lastLoginAt: user.lastLoginAt,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Google login error:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        googleId: googleData.id,
        email: googleData.email,
      });
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
