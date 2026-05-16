import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatNotificationService } from '../services/chat-notification.service';
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
import { isOriginAllowed } from '../../utils/cors-origin.util';
import { ICallGateway } from '@app/contracts/interfaces/gateway/call-gateway.interface';

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
export class CallGateway implements ICallGateway {
  @WebSocketServer() server: Server;
  constructor(
    private readonly chatNotificationService: ChatNotificationService,
  ) {}

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.CALL_OFFER)
  async handleCallOffer(
    client: Socket,
    callOfferDTO: CallOfferDTO,
  ): Promise<CallOfferResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new CallOfferResponseDTO({ success: false });
    }
    if (
      !callOfferDTO?.callId ||
      !callOfferDTO?.receiverId ||
      !callOfferDTO?.offer
    ) {
      client.emit('error', { message: 'Invalid call offer payload' });
      return new CallOfferResponseDTO({ success: false });
    }

    const callerId = client.data.userId as string;
    const profile =
      await this.chatNotificationService.getCallerProfile(callerId);

    this.server
      .to(callOfferDTO.receiverId)
      .emit(CHAT_WEBSOCKET_EVENTS.INCOMING_CALL, {
        callId: callOfferDTO.callId,
        callerId,
        callerName: profile.name,
        callerAvatar: profile.avatar,
        offer: callOfferDTO.offer,
      });

    return new CallOfferResponseDTO({ success: true });
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.CALL_ANSWER)
  async handleCallAnswer(
    client: Socket,
    callAnswerDTO: CallAnswerDTO,
  ): Promise<CallAnswerResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new CallAnswerResponseDTO({ success: false });
    }
    if (
      !callAnswerDTO?.callId ||
      !callAnswerDTO?.callerId ||
      !callAnswerDTO?.answer
    ) {
      client.emit('error', { message: 'Invalid call answer payload' });
      return new CallAnswerResponseDTO({ success: false });
    }

    this.server
      .to(callAnswerDTO.callerId)
      .emit(CHAT_WEBSOCKET_EVENTS.CALL_ANSWERED, {
        callId: callAnswerDTO.callId,
        answer: callAnswerDTO.answer,
      });

    return new CallAnswerResponseDTO({ success: true });
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.ICE_CANDIDATE)
  async handleIceCandidate(
    client: Socket,
    iceCandidateDTO: IceCandidateDTO,
  ): Promise<IceCandidateResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new IceCandidateResponseDTO({ success: false });
    }
    if (
      !iceCandidateDTO?.callId ||
      !iceCandidateDTO?.targetUserId ||
      !iceCandidateDTO?.candidate
    ) {
      client.emit('error', { message: 'Invalid ICE candidate payload' });
      return new IceCandidateResponseDTO({ success: false });
    }

    this.server
      .to(iceCandidateDTO.targetUserId)
      .emit(CHAT_WEBSOCKET_EVENTS.REMOTE_ICE_CANDIDATE, {
        callId: iceCandidateDTO.callId,
        candidate: iceCandidateDTO.candidate,
      });

    return new IceCandidateResponseDTO({ success: true });
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.CALL_DECLINE)
  async handleCallDecline(
    client: Socket,
    callDeclineDTO: CallDeclineDTO,
  ): Promise<CallDeclinedResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new CallDeclinedResponseDTO({ success: false });
    }
    if (!callDeclineDTO?.callId || !callDeclineDTO?.callerId) {
      client.emit('error', { message: 'Invalid call decline payload' });
      return new CallDeclinedResponseDTO({ success: false });
    }

    this.server
      .to(callDeclineDTO.callerId)
      .emit(CHAT_WEBSOCKET_EVENTS.CALL_DECLINED, {
        callId: callDeclineDTO.callId,
      });

    await this.chatNotificationService.emitCallLogMessage(this.server, {
      senderId: client.data.userId,
      receiverId: callDeclineDTO.callerId,
      content: 'Call declined',
    });

    return new CallDeclinedResponseDTO({ success: true });
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.CALL_END)
  async handleCallEnd(
    client: Socket,
    callEndDTO: CallEndDTO,
  ): Promise<CallEndResponseDTO> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return new CallEndResponseDTO({ success: false });
    }
    if (!callEndDTO?.callId || !callEndDTO?.targetUserId) {
      client.emit('error', { message: 'Invalid call end payload' });
      return new CallEndResponseDTO({ success: false });
    }

    this.server
      .to(callEndDTO.targetUserId)
      .emit(CHAT_WEBSOCKET_EVENTS.CALL_ENDED, {
        callId: callEndDTO.callId,
        reason: callEndDTO.reason,
      });

    const reason = (callEndDTO.reason || 'ended').toLowerCase();
    const content =
      reason === 'missed'
        ? 'Missed call'
        : reason === 'declined'
          ? 'Call declined'
          : reason === 'error'
            ? 'Call failed'
            : 'Call ended';

    await this.chatNotificationService.emitCallLogMessage(this.server, {
      senderId: client.data.userId,
      receiverId: callEndDTO.targetUserId,
      content,
    });

    return new CallEndResponseDTO({ success: true });
  }
}
