import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DecodeKhqrDTO {
  @IsString()
  @IsNotEmpty()
  qrString: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeRaw?: boolean;
}
