import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  BlockActionResponseDTO,
  BlockedUserResponseDTO,
  BlockStatusResponseDTO,
  BlockUserDTO,
  GetBlockStatusDTO,
  GetHiddenProfileIdsDTO,
  ListBlockedUsersDTO,
  ReportUserDTO,
  ReportUserResponseDTO,
  UnblockUserDTO,
} from '@app/contracts/dtos/user';
import { IModerationRpcController } from '@app/contracts/interfaces/controller/user-controllers/moderation-controller.interface';
import * as userServiceInterface from '@app/contracts/interfaces/service/user-service.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class ModerationController implements IModerationRpcController {
  constructor(
    @Inject(userServiceInterface.I_MODERATION_SERVICE)
    private readonly moderationService: userServiceInterface.IModerationService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.BLOCK_USER)
  async blockUser(
    @Payload() blockUserDTO: BlockUserDTO,
  ): Promise<BlockActionResponseDTO> {
    return this.moderationService.blockUser(blockUserDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UNBLOCK_USER)
  async unblockUser(
    @Payload() unblockUserDTO: UnblockUserDTO,
  ): Promise<BlockActionResponseDTO> {
    return this.moderationService.unblockUser(unblockUserDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.LIST_BLOCKED_USERS)
  async listBlockedUsers(
    @Payload() listBlockedUsersDTO: ListBlockedUsersDTO,
  ): Promise<BlockedUserResponseDTO[]> {
    return this.moderationService.listBlockedUsers(listBlockedUsersDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_BLOCK_STATUS)
  async getBlockStatus(
    @Payload() getBlockStatusDTO: GetBlockStatusDTO,
  ): Promise<BlockStatusResponseDTO> {
    return this.moderationService.getBlockStatus(getBlockStatusDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_HIDDEN_PROFILE_IDS)
  async getHiddenProfileIds(
    @Payload() getHiddenProfileIdsDTO: GetHiddenProfileIdsDTO,
  ): Promise<string[]> {
    return this.moderationService.getHiddenProfileIds(getHiddenProfileIdsDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REPORT_USER)
  async reportUser(
    @Payload() reportUserDTO: ReportUserDTO,
  ): Promise<ReportUserResponseDTO> {
    return this.moderationService.reportUser(reportUserDTO);
  }
}
