import { IsNotEmpty, IsString } from 'class-validator';
import { CoreResponseDTO } from '../shared/core-response.dto';

export class ForgotPasswordDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class ForgotPasswordResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<ForgotPasswordResponseDTO>) {
    super(partial);
  }
}
