import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UploadfileModule, JwtModule, DatabaseModule } from '@app/common';
import { EmployeeController } from './employee.controller';
import { CompanyController } from './company.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';

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
    DatabaseModule,
    UploadfileModule,
    JwtModule,
    TypeOrmModule.forFeature([User])
  ],
  controllers: [UserController, EmployeeController, CompanyController],
  providers: [],
})
export class UserModule {}
