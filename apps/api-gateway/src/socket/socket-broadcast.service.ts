import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketBroadcastService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToUser(userId: string, event: string, data?: any): void {
    if (!this.server || !userId) return;
    this.server.to(userId).emit(event, data);
  }
}
