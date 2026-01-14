import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { VerifyEmailResponseDTO } from '../dtos/verify-email-response.dto';
import { User } from '@app/common/database/entities/user.entity';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class VerifyEmailService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async verifyEmail(
    emailVerificationToken: string,
  ): Promise<VerifyEmailResponseDTO> {
    try {
      //Find the user by email verification token
      const decoded = await this.jwtService.verifyEmailToken(
        emailVerificationToken,
      );
      const user = await this.userRepository.findOne({
        where: {
          emailVerificationToken: emailVerificationToken,
          email: decoded.email,
        },
      });
      if (!user)
        throw new RpcException({
          message: 'Invalid Credential',
          statusCode: 401,
        });

      //Set email verification to true and email verification token to null
      user.isEmailVerified = true;
      user.emailVerificationToken = null;

      //Save user into the database
      await this.userRepository.save(user);

      return new VerifyEmailResponseDTO(
        'Your email was verified successfully. Now you can login',
      );
    } catch (error) {
      this.logger.error((error as Error).message || 'An error occurred while verifying email.');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
