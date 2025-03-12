import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UploadfileModule } from '@app/common';
import { EmployeeController } from './employee.controller';
import { CompanyController } from './company.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: USER_SERVICE.NAME,
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3002,
        },
      }
    ]),
    UploadfileModule,
  ],
  controllers: [UserController, EmployeeController, CompanyController],
  providers: [],
})
export class UserModule {}
