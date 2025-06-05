import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UploadfileModule, JwtModule, DatabaseModule } from '@app/common';
import { EmployeeController } from './employee.controller';
import { CompanyController } from './company.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('USER_SERVICE_HOST'),
            port: configService.get<number>('USER_SERVICE_PORT'),
          },
        }),
        inject: [ConfigService],
      }
    ]),
    DatabaseModule,
    UploadfileModule,
    JwtModule,
    TypeOrmModule.forFeature([User])
  ],
  controllers: [UserController, EmployeeController, CompanyController],
  providers: [],
})
export class UserModule {}
