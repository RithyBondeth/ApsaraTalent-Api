import { Injectable } from '@nestjs/common';

@Injectable()
export class SocketStateService {
  private readonly connectedUsers = new Map<string, Set<string>>();

  getConnectedUsers(): Map<string, Set<string>> {
    return this.connectedUsers;
  }

  isOnline(userId: string): boolean {
    const sockets = this.connectedUsers.get(userId);
    return sockets != null && sockets.size > 0;
  }

  addSocket(userId: string, socketId: string): boolean {
    if (!this.connectedUsers.has(userId))
      this.connectedUsers.set(userId, new Set());

    const sockets = this.connectedUsers.get(userId)!;
    const isNewOnline = sockets.size === 0;
    sockets.add(socketId);
    return isNewOnline;
  }

  removeSocket(userId: string, socketId: string): boolean {
    const sockets = this.connectedUsers.get(userId);
    if (!sockets) return false;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.connectedUsers.delete(userId);
      return true;
    }
    return false;
  }
}
