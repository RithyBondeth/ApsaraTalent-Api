import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { GetAllNotificationResponseDTO } from './get-all-notification.dto';

export class CreateNotificationCurrentUserDTO {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsOptional()
  sendPush?: boolean;

  /**
   * Whether this notification may also be emailed. Defaults to true.
   *
   * The default is safe because the *preference* defaults decide the outcome:
   * a chat message resolves to the MESSAGE category, whose email default is
   * off, so opting every emit in does not turn the platform into a mailing
   * list. Pass `false` only for something that should never be email, whatever
   * the reader has chosen.
   */
  @IsOptional()
  sendEmail?: boolean;

  @IsString()
  @IsOptional()
  senderAvatar?: string;
}

export class CreateNotificationCurrentUserResponseDTO extends GetAllNotificationResponseDTO {}
