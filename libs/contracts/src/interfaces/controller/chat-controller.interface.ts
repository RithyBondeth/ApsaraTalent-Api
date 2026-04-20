import { UserResponseDTO } from '@app/contracts/dtos';
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

export interface IChatController {
  initiateChat(
    initiateChatDTO: InitiateChatDTO,
    req: any,
  ): Promise<InitiateChatResponseDTO>;
  getRecentChats(req: any): Promise<InitiateChatResponseDTO[]>;
  uploadAttachment(
    file: Express.Multer.File,
  ): Promise<UploadAttachmentResponseDTO>;
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
