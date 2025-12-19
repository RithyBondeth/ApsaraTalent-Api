import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = async (
  configService: ConfigService,
): Promise<JwtModuleOptions> => ({
  secret: configService.get<string>('jwt.secret'),
  signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
});
