import { AuthUser } from '@app/common/decorators/user.decorator';
import {
  BlockActionResponseDTO,
  BlockedUserResponseDTO,
  BlockStatusResponseDTO,
  BlockUserDTO,
  CreateReportBodyDTO,
  GetBlockStatusDTO,
  ListBlockedUsersDTO,
  ReportUserDTO,
  ReportUserResponseDTO,
  UnblockUserDTO,
} from '@app/contracts/dtos/user';

// Internal TCP controller (user-service)
export interface IModerationRpcController {
  blockUser(blockUserDTO: BlockUserDTO): Promise<BlockActionResponseDTO>;
  unblockUser(unblockUserDTO: UnblockUserDTO): Promise<BlockActionResponseDTO>;
  listBlockedUsers(
    listBlockedUsersDTO: ListBlockedUsersDTO,
  ): Promise<BlockedUserResponseDTO[]>;
  getBlockStatus(
    getBlockStatusDTO: GetBlockStatusDTO,
  ): Promise<BlockStatusResponseDTO>;
  reportUser(reportUserDTO: ReportUserDTO): Promise<ReportUserResponseDTO>;
}

// HTTP controller (api-gateway)
export interface IModerationController {
  blockUser(user: AuthUser, userId: string): Promise<BlockActionResponseDTO>;
  unblockUser(user: AuthUser, userId: string): Promise<BlockActionResponseDTO>;
  listBlockedUsers(user: AuthUser): Promise<BlockedUserResponseDTO[]>;
  getBlockStatus(
    user: AuthUser,
    userId: string,
  ): Promise<BlockStatusResponseDTO>;
  reportUser(
    user: AuthUser,
    body: CreateReportBodyDTO,
  ): Promise<ReportUserResponseDTO>;
}
