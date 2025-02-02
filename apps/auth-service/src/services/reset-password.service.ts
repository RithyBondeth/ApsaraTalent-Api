import { User } from "@app/common/database/entities/user.entity";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { MoreThan, Repository } from "typeorm";
import { ResetPasswordDTO } from "../dtos/reset-password.dto";
import * as crypto from "crypto";
import { ResetPasswordResponseDTO } from "../dtos/reset-password-response.dto";

@Injectable()
export class ResetPasswordService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly logger: PinoLogger,
    ) {}

    async resetPassword(resetPasswordDTO: ResetPasswordDTO): Promise<ResetPasswordResponseDTO> {
        try {
             //Check if new password and confirm password are valid
            const isMatchedPassword = resetPasswordDTO.newPassword === resetPasswordDTO.confirmPassword;
            if(!isMatchedPassword) throw new UnauthorizedException('Password do not match');
            
            //Hashed the reset token
            const hashedToken = crypto.createHash('sha256').update(resetPasswordDTO.token).digest('hex');
            
            //Find staff by resetToken and check if expireToken is still valid
            const user = await this.userRepository.findOne({
                where: {
                    resetPasswordToken: hashedToken,
                    resetPasswordExpires: MoreThan(new Date()),
                }
            });
            if(!user) throw new UnauthorizedException('Invalid token or expires token');

            //Set user new password and save user into the database
            user.password = resetPasswordDTO.newPassword;
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await this.userRepository.save(user);

            //Return message
            return new ResetPasswordResponseDTO('You password was updated successfully');
        } catch (error) {
            this.logger.error('Failed to reset password', error.message);
            throw new UnauthorizedException(error.message);
        }  
    }  
}