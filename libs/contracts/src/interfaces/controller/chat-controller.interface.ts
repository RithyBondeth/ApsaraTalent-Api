import {
  InitiateChatDTO,
  InitiateChatResponseDTO,
  UploadAttachmentResponseDTO,
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
