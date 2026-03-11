import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { checkEmail } from 'utils/functions/check-email';
import { LoginResponseDTO } from '../dtos/login-response.dto';
import { LoginDTO } from '../dtos/login.dto';

@Injectable()
export class LoginService {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async login(loginDTO: LoginDTO): Promise<LoginResponseDTO> {
    try {
      // Check if identifier is email or phone
      const isEmail = checkEmail(loginDTO.identifier);

      //Find the user by their email address
      const user = await this.userRepository.findOne({
        where: isEmail
          ? { email: loginDTO.identifier }
          : { phone: loginDTO.identifier },
      });

      if (!user)
        throw new RpcException({
          message: `There's no user with this ${isEmail ? 'email address' : 'phone number'}`,
          statusCode: 401,
        });

      //Compare password
      const validPassword: boolean = await bcrypt.compare(
        loginDTO.password,
        user.password,
      );

      if (!validPassword)
        throw new RpcException({
          message: 'Incorrect password',
          statusCode: 401,
        });

      //Check email verification
      if (isEmail && !user.isEmailVerified)
        throw new RpcException({
          message: 'Please verify your email first',
          statusCode: 403,
        });

      //Generate tokens
      const payload: IPayload = {
        id: user.id,
        info: isEmail ? user.email : user.phone,
        role: user.role,
      };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      //Save refresh token and update login tracking
      user.refreshToken = refreshToken;
      user.lastLoginMethod = ELoginMethod.EMAIL_PASSWORD;
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      // Clear Cache in USER SERVICE
      console.log(
        '[AUTH] sending CLEAR_USER_CACHE from EMAIL_PASSWORD_LOGIN',
        user.id,
      );
      await firstValueFrom(
        this.userClient.send(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE, {
          userId: user.id,
        }),
      );

      //Return token and user details
      return new LoginResponseDTO({
        message: 'Successfully Logged in',
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: user,
      });
    } catch (error) {
      this.logger.error((error as Error).message || 'Login failed');
      // If it's already an RpcException, rethrow it
      if (error instanceof RpcException) throw error;
      // Otherwise, wrap unexpected errors in RpcException
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
