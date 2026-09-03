import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import {
  NotificationPreferenceResponseDTO,
  NotificationPreferenceUserDTO,
  UnsubscribeDTO,
  UnsubscribeResponseDTO,
  UpdateNotificationPreferenceDTO,
} from '@app/contracts/dtos/notification';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationPreferenceService } from '../services/notification-preference.service';

@Controller()
export class NotificationPreferenceController {
  constructor(
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.GET_PREFERENCES)
  async getPreferences(
    @Payload() dto: NotificationPreferenceUserDTO,
  ): Promise<NotificationPreferenceResponseDTO> {
    return this.preferenceService.resolve(dto);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.UPDATE_PREFERENCES)
  async updatePreferences(
    @Payload() dto: UpdateNotificationPreferenceDTO,
  ): Promise<NotificationPreferenceResponseDTO> {
    return this.preferenceService.update(dto);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.UNSUBSCRIBE)
  async unsubscribe(
    @Payload() dto: UnsubscribeDTO,
  ): Promise<UnsubscribeResponseDTO> {
    return this.preferenceService.unsubscribe(dto);
  }
}
