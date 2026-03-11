import { DatabaseModule, JwtModule, UploadfileModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { CompanyController } from './company.controller';
import { EmployeeController } from './employee.controller';
import { UserController } from './user.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.user.host'),
            port: configService.get<number>('services.user.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    DatabaseModule,
    UploadfileModule,
    JwtModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UserController, EmployeeController, CompanyController],
  providers: [],
})
export class UserModule {}
