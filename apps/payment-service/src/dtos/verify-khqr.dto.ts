import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyKhqrDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;
}
