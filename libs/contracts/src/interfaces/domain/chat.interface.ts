export interface TChatPayload {
  receiverId: string;
  content: string;
  type?: 'text' | 'image' | 'document' | 'audio' | 'call';
  /** UUID of the message being replied to (optional) */
  replyToId?: string | null;
  /** URL of an uploaded file/image attachment (optional) */
  attachment?: string | null;
  /** Original filename of the attachment (optional, for display purposes) */
  attachmentFilename?: string | null;
  /** Duration in seconds for audio attachments (optional) */
  attachmentDuration?: number | null;
  /** Waveform amplitude data for audio attachments (optional) */
  attachmentAmplitude?: number[] | null;
}

export interface IChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  reactions: {};
  sentAt: Date;
  /** True when sender deleted the message (soft-delete tombstone) */
  isDeleted?: boolean;
  /**
   * True when the sender has edited the message after sending.
   * Shown as a small "(edited)" label in the bubble.
   */
  isEdited?: boolean;
  /** UUID of the message being quoted/replied to, or null for top-level messages */
  replyToId?: string | null;
  /** URL of an uploaded file or image attachment */
  attachment?: string | null;
  attachmentType?: string | null;
  attachmentFilename?: string | null;
  attachmentDuration?: number | null;
  attachmentAmplitude?: number[] | null;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
}

import {
  InitiateChatDTO,
  InitiateChatResponseDTO,
  UploadAttachmentResponseDTO,
} from '../../dtos/chat';

export interface IChatController {
  initiateChat(
    body: InitiateChatDTO,
    req: any,
  ): Promise<InitiateChatResponseDTO>;
  getRecentChats(req: any): Promise<InitiateChatResponseDTO[]>;
  uploadAttachment(file: any, req: any): Promise<UploadAttachmentResponseDTO>;
}
