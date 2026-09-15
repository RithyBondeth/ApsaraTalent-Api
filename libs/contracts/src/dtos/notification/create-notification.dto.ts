import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { GetAllNotificationResponseDTO } from './get-all-notification.dto';

/**
 * One file to attach alongside the notification email. Serializable over
 * the TCP microservice hop — `content` is a UTF-8 string, and nodemailer
 * handles the actual MIME encoding on the send side. Not a class-validator
 * shape because we want to allow arbitrary bytes in content; the emitting
 * service is trusted.
 */
export interface INotificationEmailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

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

  /**
   * Files to attach to the email side of the notification. Ignored when
   * `sendEmail` resolves to false. Kept optional — the vast majority of
   * emits have no attachment; only interview invites do today.
   */
  @IsArray()
  @IsOptional()
  emailAttachments?: INotificationEmailAttachment[];
}

export class CreateNotificationCurrentUserResponseDTO extends GetAllNotificationResponseDTO {}
