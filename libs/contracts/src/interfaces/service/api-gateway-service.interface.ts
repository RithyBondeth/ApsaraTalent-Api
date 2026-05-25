import { Response } from 'express';
import { UserResponseDTO } from '@app/contracts/dtos/shared/user.dto';
import { SendMessageDTO } from '@app/contracts/dtos/chat/chat-gateway/send-message.dto';

export const I_ICE_SERVERS_SERVICE = 'IIceServersService';
export const I_SOCIAL_AUTH_SERVICE = 'ISocialAuthService';
export const I_JOB_ACCESS_SERVICE = 'IJobAccessService';
export const I_CHAT_MESSAGE_SERVICE = 'IChatMessageService';

export type SocialCallbackParams = {
  req: any;
  res: Response;
  action: string | { cmd: string };
  payload: any;
  providerLabel: string;
  successType: string;
  errorType: string;
  failureMessage: string;
  timeoutMs?: number;
};

export type SendMessageResult = {
  usersData: any;
  savedMessage: any;
  trimmedContent: string;
  messageType: string;
  hasAttachment: boolean;
};

export interface IIceServersService {
  getIceServers(): Promise<{ iceServers: object[] }>;
}

export interface ISocialAuthService {
  handleCallback(params: SocialCallbackParams): Promise<void>;
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
  ): Promise<SendMessageResult>;
}
