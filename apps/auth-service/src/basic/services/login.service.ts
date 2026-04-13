import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { checkEmail } from '@app/utils/functions/check-email';
import { ILoginService } from '@app/contracts/interfaces/service/auth-service.interface';
import { LoginDTO, LoginResponseDTO, UserResponseDTO } from '@app/contracts';
import { CacheCleanupService } from '../../shared/services/cache-cleanup.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class LoginService implements ILoginService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheCleanupService: CacheCleanupService,
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

      // Use a single generic error for both missing user and wrong password
      // to prevent user enumeration attacks
      const invalidCredentialsError = new RpcException({
        message: 'Invalid credentials',
        statusCode: 401,
      });

      if (!user || !user.password) throw invalidCredentialsError;

      //Compare password
      const validPassword: boolean = await bcrypt.compare(
        loginDTO.password,
        user.password,
      );

      if (!validPassword) throw invalidCredentialsError;

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
      await this.cacheCleanupService.clear(user.id);

      //Return token and user details
      return new LoginResponseDTO({
        message: 'Successfully Logged in',
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: new UserResponseDTO({
          ...user,
          employee: undefined,
          company: undefined,
        }),
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
