import { JwtModule, UploadfileModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { CompanyController } from './controllers/company.controller';
import { EmployeeController } from './controllers/employee.controller';
import { ModerationController } from './controllers/moderation.controller';
import { SupportController } from './controllers/support.controller';
import { AccountLifecycleController } from './controllers/account-lifecycle.controller';
import { PublicUserController } from './controllers/public-user.controller';
import { UserController } from './controllers/user.controller';
import { UserAccessService } from './services/user-access.service';
import { EmployeeProfileOwnerGuard } from './guards/employee-profile-owner.guard';
import { CompanyProfileOwnerGuard } from './guards/company-profile-owner.guard';
import { EmployeeDocumentAccessGuard } from './guards/employee-document-access.guard';

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
    UploadfileModule,
    JwtModule,
  ],
  controllers: [
    UserController,
    EmployeeController,
    CompanyController,
    PublicUserController,
    ModerationController,
    SupportController,
    AccountLifecycleController,
  ],
  providers: [
    UserAccessService,
    EmployeeProfileOwnerGuard,
    CompanyProfileOwnerGuard,
    EmployeeDocumentAccessGuard,
  ],
})
export class UserModule {}
