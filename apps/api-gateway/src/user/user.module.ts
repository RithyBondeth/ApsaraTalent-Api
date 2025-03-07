import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

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
  ],
  controllers: [UserController],
  providers: [],
})
export class UserModule {}
