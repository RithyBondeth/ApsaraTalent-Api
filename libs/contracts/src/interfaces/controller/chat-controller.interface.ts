import { UserResponseDTO } from '@app/contracts/dtos';
import { Response } from 'express';
import {
  CreateMessageDTO,
  CreateMessageResponseDTO,
  CreateOrGetChatDTO,
  DeleteMessageResponseDTO,
  DeleteMessageRpcDTO,
  EditMessageResponseDTO,
  EditMessageRpcDTO,
  GetChatHistoryResponseDTO,
  GetChatHistoryRpcDTO,
  GetRecentChatsResponseDTO,
  InitiateChatDTO,
  InitiateChatResponseDTO,
  MarkAsReadResponseDTO,
  MarkAsReadRpcDTO,
  UpdateReactionResponseDTO,
  UpdateReactionRpcDTO,
  UploadAttachmentResponseDTO,
  ValidateChatUsersDTO,
  ValidateChatUsersResponseDTO,
} from '@app/contracts/dtos/chat';
import {
  CanAccessAttachmentDTO,
  CanAccessAttachmentResponseDTO,
} from '@app/contracts/dtos/chat/chat-service/can-access-attachment.dto';

export interface IChatController {
  initiateChat(
    initiateChatDTO: InitiateChatDTO,
    req: any,
  ): Promise<InitiateChatResponseDTO>;
  getRecentChats(req: any): Promise<InitiateChatResponseDTO[]>;
  uploadAttachment(
    file: Express.Multer.File,
  ): Promise<UploadAttachmentResponseDTO>;
  getAttachment(
    date: string,
    filename: string,
    req: any,
    res: Response,
  ): Promise<void>;
}

export interface IChatRpcController {
  createOrGetChat(
    createOrGetChatDTO: CreateOrGetChatDTO,
  ): Promise<InitiateChatResponseDTO>;
  createMessage(
    createMessageDTO: CreateMessageDTO,
  ): Promise<CreateMessageResponseDTO>;
  markAsRead(
    markAsReadRpcDTO: MarkAsReadRpcDTO,
  ): Promise<MarkAsReadResponseDTO>;
  getUserByIdForChat(userId: string): Promise<UserResponseDTO>;
  canAccessAttachment(
    canAccessAttachmentDTO: CanAccessAttachmentDTO,
  ): Promise<CanAccessAttachmentResponseDTO>;
  validateChatUsers(
    validateChatUsersDTO: ValidateChatUsersDTO,
  ): Promise<ValidateChatUsersResponseDTO>;
  getChatHistory(
    getChatHistoryRpcDTO: GetChatHistoryRpcDTO,
  ): Promise<GetChatHistoryResponseDTO>;
  getUnreadCount(userId: string): Promise<number>;
  getRecentChats(userId: string): Promise<GetRecentChatsResponseDTO[]>;
  updateReaction(
    updateReactionRpcDTO: UpdateReactionRpcDTO,
  ): Promise<UpdateReactionResponseDTO>;
  editMessage(
    editMessageRpcDTO: EditMessageRpcDTO,
  ): Promise<EditMessageResponseDTO>;
  deleteMessage(
    deleteMessageRpcDTO: DeleteMessageRpcDTO,
  ): Promise<DeleteMessageResponseDTO>;
}
