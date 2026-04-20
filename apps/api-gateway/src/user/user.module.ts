import { DatabaseModule, JwtModule, UploadfileModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { CompanyController } from './controllers/company.controller';
import { EmployeeController } from './controllers/employee.controller';
import { PublicUserController } from './controllers/public-user.controller';
import { UserController } from './controllers/user.controller';

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
  controllers: [
    UserController,
    EmployeeController,
    CompanyController,
    PublicUserController,
  ],
  providers: [],
})
export class UserModule {}
