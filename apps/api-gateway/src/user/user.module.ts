import { DatabaseModule, JwtModule, UploadfileModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
<<<<<<< HEAD
import { USER_SERVICE } from 'utils/constants/user-service.constant';
=======
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { CompanyController } from './company.controller';
import { EmployeeController } from './employee.controller';
import { UserController } from './user.controller';
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE.NAME,
<<<<<<< HEAD
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3002,
        }
      }
    ])
=======
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
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
  ],
  controllers: [UserController, EmployeeController, CompanyController],
  providers: [],
})
export class UserModule {}
