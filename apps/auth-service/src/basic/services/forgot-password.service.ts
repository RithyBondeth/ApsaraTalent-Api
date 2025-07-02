import { EmailService } from '@app/common/email/email.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForgotPasswordDTO } from '../dtos/forgot-password.dto';
import { PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';
import { ForgotPasswordResponseDTO } from '../dtos/forgot-password-response.dto';
import { User } from '@app/common/database/entities/user.entity';
import { RpcException } from '@nestjs/microservices';
import { checkEmail } from 'utils/functions/check-email';
import { MessageService } from '@app/common/message/message.service';

@Injectable()
export class ForgotPasswordService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly messageService: MessageService,
    private readonly logger: PinoLogger,
  ) {}

  async forgotPassword(
    forgotPasswordDTO: ForgotPasswordDTO,
  ): Promise<ForgotPasswordResponseDTO> {
    try {
      //Check if identifier is email or phone
      const isEmail = checkEmail(forgotPasswordDTO.identifier);

      //Find the user by their email address
      const user = await this.userRepository.findOne({
        where: isEmail
          ? { email: forgotPasswordDTO.identifier }
          : { phone: forgotPasswordDTO.identifier },
      });

      if (!user)
        throw new RpcException({
          message: `There's no user with this ${isEmail ? 'email address' : 'phone number'}`,
          statusCode: 401,
        });

      //Generate a reset password token and expiry date
      const resetToken = crypto.randomBytes(20).toString('hex');
      const expireDateToken = new Date(Date.now() + 3600000); // 1 hour

      //Set a reset password token and expiry date
      user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      user.resetPasswordExpires = expireDateToken;
      await this.userRepository.save(user);

      console.log('reset token: ', resetToken);

      if((user.email && !user.phone) || (user.email && user.phone)) {
        //Send reset password token to user email address
        await this.emailService.sendEmail({
            to: user.email,
            subject: 'Apsara Talent - Reset Password Token',
            text: `Hello, ${user.email}. Here is your reset password token: ${resetToken}.`,
        });

        return new ForgotPasswordResponseDTO(
         `Reset password token was sent successfully to ${user.email}`,
        );
      } 

      if(!user.email && user.phone) {
        //Send reset password token to user phone number
        await this.messageService.sendResetToken(user.phone, resetToken);

        return new ForgotPasswordResponseDTO(
            `Reset password token was sent successfully to ${user.phone}`,
        ); 
      }
    } catch (error) {
      this.logger.error(error?.message || 'Forgot password failed');
      if (error instanceof RpcException) throw error;
      throw new RpcException({ message: error.message, statusCode: 500 });
    }
  }
}
