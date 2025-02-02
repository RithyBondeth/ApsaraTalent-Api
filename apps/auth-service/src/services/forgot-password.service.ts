import { User } from "@app/common/database/entities/user.entity";
import { EmailService } from "@app/common/email/email.service";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ForgotPasswordDTO } from "../dtos/forgot-password.dto";
import { PinoLogger } from "nestjs-pino";
import * as crypto from "crypto";
import { ForgotPasswordResponseDTO } from "../dtos/forgot-password-response.dto";

@Injectable()
export class ForgotPasswordService {
    private readonly logger: PinoLogger

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly emailService: EmailService,
    ) {}

    async forgotPassword(forgotPasswordDTO: ForgotPasswordDTO): Promise<ForgotPasswordResponseDTO> {
        try {
            //Find the user by their email address
            const user = await this.userRepository.findOne({ where: { email: forgotPasswordDTO.email } });
            if(!user) throw new UnauthorizedException('Invalid credentials (Email not found)');

            //Generate a reset password token and expiry date
            const resetToken = crypto.randomBytes(20).toString('hex');
            const expireDateToken =  new Date(Date.now() + 10 * 60 * 1000);

            //Set a reset password token and expiry date
            user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.resetPasswordExpires = expireDateToken;

            //Send reset password token to user email address
            await this.emailService.sendEmail({
                to: user.email,
                subject: 'Apsara Talent - Reset Password Token',
                text: `Hello, ${user.username}. Here is your reset password token: ${resetToken}.`,
            });

            return new ForgotPasswordResponseDTO(`Reset password token was sent successfully to ${user.email}`);
        } catch (error) {
            this.logger.error('Failure while forgot password: ', error.message);
            throw new BadRequestException(error.message);
        }
    }
}