import { IsNotEmpty, IsString, Length } from 'class-validator';
import { CoreResponseDTO } from '../shared/core-response.dto';
import { GenerateIndividualKhqrDTO } from './generate-individual-khqr.dto';

export class GenerateMerchantKhqrDTO extends GenerateIndividualKhqrDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 15, { message: 'Merchant ID must be between 1 and 15 characters' })
  merchantId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 25, {
    message: 'Acquiring bank name must be between 1 and 25 characters',
  })
  acquiringBank: string;
}

export class GenerateMerchantKhqrResponseDTO extends CoreResponseDTO {
  success: true;
  paymentId: string;
  qrString: string;
  md5Hash: string;
  qrImage: string;

  constructor(partial: Partial<GenerateMerchantKhqrResponseDTO>) {
    super(partial);
  }
}
