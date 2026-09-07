import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  I_PROFILE_ANALYTICS_SERVICE,
  IProfileAnalyticsService,
  ProfileAnalyticsResponseDTO,
  UpdatePrivacyDTO,
  UpdatePrivacyResponseDTO,
} from '@app/contracts';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class ProfileAnalyticsController {
  constructor(
    @Inject(I_PROFILE_ANALYTICS_SERVICE)
    private readonly service: IProfileAnalyticsService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.GET_MY_PROFILE_ANALYTICS)
  getMyProfileAnalytics(
    @Payload('userId') userId: string,
  ): Promise<ProfileAnalyticsResponseDTO> {
    return this.service.getMyProfileAnalytics(userId);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_PRIVACY_SETTINGS)
  updatePrivacySettings(
    @Payload('userId') userId: string,
    @Payload('dto') dto: UpdatePrivacyDTO,
  ): Promise<UpdatePrivacyResponseDTO> {
    return this.service.updatePrivacySettings(userId, dto);
  }
}
