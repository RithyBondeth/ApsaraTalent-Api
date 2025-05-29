import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { MoreThan, Repository } from "typeorm";
import { ResetPasswordDTO } from "../dtos/reset-password.dto";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import { ResetPasswordResponseDTO } from "../dtos/reset-password-response.dto";
import { SALT_ROUNDS } from "utils/constants/password.constant";
import { User } from "@app/common/database/entities/user.entity";
import { RpcException } from "@nestjs/microservices";

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
            if(!isMatchedPassword) throw new RpcException({ message: "Password do not matches", statusCode: 401 });
            
            //Hashed the reset token
            const hashedToken = crypto.createHash('sha256').update(resetPasswordDTO.token).digest('hex');
            
            //Find staff by resetToken and check if expireToken is still valid
            const user = await this.userRepository.findOne({
                where: {
                    resetPasswordToken: hashedToken,
                    resetPasswordExpires: MoreThan(new Date()),
                }
            });
            if(!user) throw new RpcException({ message: "Invalid token or expires token", statusCode: 401 });

            //Set user new password and save user into the database
            user.password = await bcrypt.hash(resetPasswordDTO.newPassword, SALT_ROUNDS);
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await this.userRepository.save(user);

            //Return message
            return new ResetPasswordResponseDTO('You password was updated successfully');
        } catch (error) {
            this.logger.error(error.message);
            throw new RpcException({ message: "An error occurred while user resetting password.", statusCode: 500 });
        }  
    }  
}