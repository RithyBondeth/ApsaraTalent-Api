import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatGatewayService } from './chat-gateway.service';
import {
  CHAT_ALLOW_ALL_CORS,
  CHAT_ALLOWED_ORIGINS,
  CHAT_WEBSOCKET_EVENTS,
  CallAnswerDTO,
  CallDeclineDTO,
  CallEndDTO,
  CallOfferDTO,
  IceCandidateDTO,
  CallOfferResponseDTO,
  CallAnswerResponseDTO,
  IceCandidateResponseDTO,
  CallDeclinedResponseDTO,
  CallEndResponseDTO,
} from '@app/contracts';
import { isOriginAllowed } from '../utils/cors-origin.util';

@WebSocketGateway({
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      if (CHAT_ALLOW_ALL_CORS || isOriginAllowed(origin, CHAT_ALLOWED_ORIGINS))
        callback(null, true);
      else callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
  },
})
export class CallGateway {
  @WebSocketServer() server: Server;
  constructor(private readonly chatGatewayService: ChatGatewayService) {}

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.CALL_OFFER)
  async handleCallOffer(
    client: Socket,
    data: CallOfferDTO,
  ): Promise<CallOfferResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new CallOfferResponseDTO({ success: false });
    }
    if (!data?.callId || !data?.receiverId || !data?.offer) {
      client.emit('error', { message: 'Invalid call offer payload' });
      return new CallOfferResponseDTO({ success: false });
    }

    const callerId = client.data.userId as string;
    const profile = await this.chatGatewayService.getCallerProfile(callerId);

    this.server.to(data.receiverId).emit(CHAT_WEBSOCKET_EVENTS.INCOMING_CALL, {
      callId: data.callId,
      callerId,
      callerName: profile.name,
      callerAvatar: profile.avatar,
      offer: data.offer,
    });

    return new CallOfferResponseDTO({ success: true });
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.CALL_ANSWER)
  async handleCallAnswer(
    client: Socket,
    data: CallAnswerDTO,
  ): Promise<CallAnswerResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new CallAnswerResponseDTO({ success: false });
    }
    if (!data?.callId || !data?.callerId || !data?.answer) {
      client.emit('error', { message: 'Invalid call answer payload' });
      return new CallAnswerResponseDTO({ success: false });
    }

    this.server.to(data.callerId).emit(CHAT_WEBSOCKET_EVENTS.CALL_ANSWERED, {
      callId: data.callId,
      answer: data.answer,
    });

    return new CallAnswerResponseDTO({ success: true });
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.ICE_CANDIDATE)
  async handleIceCandidate(
    client: Socket,
    data: IceCandidateDTO,
  ): Promise<IceCandidateResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new IceCandidateResponseDTO({ success: false });
    }
    if (!data?.callId || !data?.targetUserId || !data?.candidate) {
      client.emit('error', { message: 'Invalid ICE candidate payload' });
      return new IceCandidateResponseDTO({ success: false });
    }

    this.server
      .to(data.targetUserId)
      .emit(CHAT_WEBSOCKET_EVENTS.REMOTE_ICE_CANDIDATE, {
        callId: data.callId,
        candidate: data.candidate,
      });

    return new IceCandidateResponseDTO({ success: true });
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.CALL_DECLINE)
  async handleCallDecline(
    client: Socket,
    data: CallDeclineDTO,
  ): Promise<CallDeclinedResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new CallDeclinedResponseDTO({ success: false });
    }
    if (!data?.callId || !data?.callerId) {
      client.emit('error', { message: 'Invalid call decline payload' });
      return new CallDeclinedResponseDTO({ success: false });
    }

    this.server
      .to(data.callerId)
      .emit(CHAT_WEBSOCKET_EVENTS.CALL_DECLINED, { callId: data.callId });

    await this.chatGatewayService.emitCallLogMessage(this.server, {
      senderId: client.data.userId,
      receiverId: data.callerId,
      content: 'Call declined',
    });

    return new CallDeclinedResponseDTO({ success: true });
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.CALL_END)
  async handleCallEnd(
    client: Socket,
    data: CallEndDTO,
  ): Promise<CallEndResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new CallEndResponseDTO({ success: false });
    }
    if (!data?.callId || !data?.targetUserId) {
      client.emit('error', { message: 'Invalid call end payload' });
      return new CallEndResponseDTO({ success: false });
    }

    this.server.to(data.targetUserId).emit(CHAT_WEBSOCKET_EVENTS.CALL_ENDED, {
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

    return new CallEndResponseDTO({ success: true });
  }
}
