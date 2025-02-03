import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { LoginDTO } from "../dtos/login.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "@app/common/database/entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from 'bcrypt';
import { JwtService } from "@app/common/jwt/jwt.service";
import { IPayload } from "@app/common/jwt/interfaces/payload.interface";
import { LoginResponseDTO } from "../dtos/login-response.dto";
import { RegisterReponseDTO } from "../dtos/register-response.dto";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class LoginService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly logger: PinoLogger,
    ) {}

    async login(loginDTO: LoginDTO): Promise<LoginResponseDTO> {
        try {
            //Find the user by their email address
            const user = await this.userRepository.findOne({ where: { email: loginDTO.email } });
            if(!user) throw new UnauthorizedException('Invalid Credentials (Email not found)'); 

            //Check email verification
            if(!user.isEmailVerified) throw new UnauthorizedException('Please verify your email first');

            //Compare password
            const validPassword: boolean = await bcrypt.compare(loginDTO.password, user.password); 
            if(!validPassword) throw new UnauthorizedException('Invalid Credentials (Wrong password)');

            //Generate tokens
            const payload: IPayload = {
                id: user.id,    
                username: user.username,
                role: user.role,
            };
            const [accessToken, refreshToken] = await Promise.all([
                this.jwtService.generateToken(payload),
                this.jwtService.generateRefreshToken(user.id), 
            ]);

            //Save refresh token to use
            user.refreshToken = refreshToken;
            await this.userRepository.save(user);

            //Return token and user details
            return new LoginResponseDTO({
                message: 'Successfully Logged in',
                accessToken: accessToken,
                refreshToken: refreshToken,
                user: new RegisterReponseDTO(user),
            });
        } catch (error) {
            this.logger.error(error.message);
            throw new BadRequestException('An error occurred while login.');
        }
    }
}