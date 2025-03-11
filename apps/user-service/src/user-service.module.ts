import { Module } from '@nestjs/common';
import { UserServiceController } from './user-service.controller';
import { UserServiceService } from './user-service.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, LoggerModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entiry';
import { Employee } from '@app/common/database/entities/employee/employee.entiry';
import { Company } from '@app/common/database/entities/company/company.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/user-service/.env',
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([ User, Employee, Company ]),
    LoggerModule,
  ],
  controllers: [UserServiceController],
  providers: [UserServiceService],
})
export class UserServiceModule {}
