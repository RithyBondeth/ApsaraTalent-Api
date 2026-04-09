import { Logger } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatGatewayService } from './chat-gateway.service';
import {
  isOriginAllowed,
  parseAllowedOrigins,
} from '../utils/cors-origin.util';

const CHAT_ALLOWED_ORIGINS = parseAllowedOrigins(
  process.env.ALLOWED_ORIGINS,
  process.env.FRONTEND_ORIGIN,
);
const CHAT_ALLOW_ALL_CORS = process.env.CORS_ALLOW_ALL === 'true';

@WebSocketGateway({
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      if (
        CHAT_ALLOW_ALL_CORS ||
        isOriginAllowed(origin, CHAT_ALLOWED_ORIGINS)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`), false);
      }
    },
    credentials: true,
  },
})
export class CallGateway {
  @WebSocketServer() server: Server;
  private logger = new Logger('CallGateway');

  constructor(private readonly chatGatewayService: ChatGatewayService) {}

  @SubscribeMessage('callOffer')
  async handleCallOffer(
    client: Socket,
    data: {
      callId: string;
      receiverId: string;
      offer: any; // RTCSessionDescriptionInit
    },
  ) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (!data?.callId || !data?.receiverId || !data?.offer) {
      client.emit('error', { message: 'Invalid call offer payload' });
      return;
    }

    const callerId = client.data.userId as string;
    const profile = await this.chatGatewayService.getCallerProfile(callerId);

    this.server.to(data.receiverId).emit('incomingCall', {
      callId: data.callId,
      callerId,
      callerName: profile.name,
      callerAvatar: profile.avatar,
      offer: data.offer,
    });

    return { success: true };
  }

  @SubscribeMessage('callAnswer')
  async handleCallAnswer(
    client: Socket,
    data: {
      callId: string;
      callerId: string;
      answer: any; // RTCSessionDescriptionInit
    },
  ) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (!data?.callId || !data?.callerId || !data?.answer) {
      client.emit('error', { message: 'Invalid call answer payload' });
      return;
    }

    this.server.to(data.callerId).emit('callAnswered', {
      callId: data.callId,
      answer: data.answer,
    });

    return { success: true };
  }

  @SubscribeMessage('iceCandidate')
  async handleIceCandidate(
    client: Socket,
    data: {
      callId: string;
      targetUserId: string;
      candidate: any; // RTCIceCandidateInit
    },
  ) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (!data?.callId || !data?.targetUserId || !data?.candidate) {
      client.emit('error', { message: 'Invalid ICE candidate payload' });
      return;
    }

    this.server.to(data.targetUserId).emit('remoteIceCandidate', {
      callId: data.callId,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('callDecline')
  async handleCallDecline(
    client: Socket,
    data: { callId: string; callerId: string },
  ) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (!data?.callId || !data?.callerId) {
      client.emit('error', { message: 'Invalid call decline payload' });
      return;
    }

    this.server.to(data.callerId).emit('callDeclined', { callId: data.callId });

    // Log a call message in chat history for both participants
    await this.chatGatewayService.emitCallLogMessage(this.server, {
      senderId: client.data.userId,
      receiverId: data.callerId,
      content: 'Call declined',
    });
  }

  @SubscribeMessage('callEnd')
  async handleCallEnd(
    client: Socket,
    data: { callId: string; targetUserId: string; reason?: string },
  ) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (!data?.callId || !data?.targetUserId) {
      client.emit('error', { message: 'Invalid call end payload' });
      return;
    }

    this.server.to(data.targetUserId).emit('callEnded', {
      callId: data.callId,
      reason: data.reason,
    });

    const reason = (data.reason || 'ended').toLowerCase();
    const content =
      reason === 'missed'
        ? 'Missed call'
        : reason === 'declined'
          ? 'Call declined'
          : reason === 'error'
            ? 'Call failed'
            : 'Call ended';

    await this.chatGatewayService.emitCallLogMessage(this.server, {
      senderId: client.data.userId,
      receiverId: data.targetUserId,
      content,
    });
  }
}
