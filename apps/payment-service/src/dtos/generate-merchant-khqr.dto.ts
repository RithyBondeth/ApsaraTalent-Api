import { IsNotEmpty, IsString, Length } from "class-validator";
import { GenerateIndividualKhqrDTO } from "./generate-individual-khqr.dto";

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