import { Global, Module } from '@nestjs/common';
import { SocketBroadcastService } from './socket-broadcast.service';

@Global()
@Module({
  providers: [SocketBroadcastService],
  exports: [SocketBroadcastService],
})
export class SocketModule {}
