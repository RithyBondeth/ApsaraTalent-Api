import { UserResponseDTO } from '@app/contracts/dtos/shared/user.dto';
import {
  SendMessageDTO,
  SendMessageResultDTO,
} from '@app/contracts/dtos/chat/chat-gateway/send-message.dto';
import { IParsedResumeData, ISocialAuthCallbackOptions } from '../domain';
import { Server } from 'socket.io';
import { HealthIndicatorResult } from '@nestjs/terminus';

export const I_ICE_SERVERS_SERVICE = 'IIceServersService';
export const I_SOCIAL_AUTH_SERVICE = 'ISocialAuthService';
export const I_JOB_ACCESS_SERVICE = 'IJobAccessService';
export const I_CHAT_MESSAGE_SERVICE = 'IChatMessageService';

export interface IIceServersService {
  getIceServers(): Promise<{ iceServers: object[] }>;
}

export interface IResumeParseService {
  parseResume(fileBuffer: Buffer, mimetype: string): Promise<IParsedResumeData>;
}

export interface ISocialAuthService {
  handleCallback(socialAuthParams: ISocialAuthCallbackOptions): Promise<void>;
}

export interface IJobAccessService {
  getCurrentUserProfile(userId: string): Promise<UserResponseDTO>;
  assertEmployeeAccess(
    requestUserId: string,
    employeeId: string,
  ): Promise<void>;
  assertCompanyAccess(requestUserId: string, companyId: string): Promise<void>;
  assertMatchParticipantAccess(
    requestUserId: string,
    eid: string,
    cid: string,
  ): Promise<void>;
}

export interface IChatMessageService {
  sendMessage(
    senderId: string,
    sendMessageDTO: SendMessageDTO,
  ): Promise<SendMessageResultDTO>;
}

export interface IChatNotificationService {
  getCallerProfile(userId: string): Promise<{
    name: string;
    avatar: string;
  }>;

  notifyChatMessage(
    server: Server,
    params: {
      senderId: string;
      receiverId: string;
      messageType: string;
      content: string;
      hasAttachment: boolean;
      attachmentFilename?: string | null;
      messageId: string;
    },
  ): Promise<void>;

  resolveCallEndContent(reason: string): string;

  emitCallLogMessage(
    server: Server,
    params: {
      senderId: string;
      receiverId: string;
      content: string;
    },
  ): Promise<void>;
}

export interface IChatRateLimiterService {
  isRateLimited(userId: string): boolean;
}

export interface ISocketStateService {
  getConnectedUsers(): Map<string, Set<string>>;
  isOnline(userId: string): boolean;
  addSocket(userId: string, socketId: string): void;
  removeSocket(userId: string, socketId: string): boolean;
}

export interface IInternalServiceHealthIndicator {
  pingCheck<Key extends string = string>(
    key: Key,
  ): Promise<HealthIndicatorResult<Key>>;
}
