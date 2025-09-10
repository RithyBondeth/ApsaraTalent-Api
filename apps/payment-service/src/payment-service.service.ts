import { Injectable } from '@nestjs/common';
import { GenerateIndividualKhqrDTO } from './dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from './dtos/generate-merchant-khqr.dto';

@Injectable()
export class PaymentServiceService {
  async generateIndividualKhqrDTO(generateIndividualKhqrDTO: GenerateIndividualKhqrDTO): Promise<any> {}

  async generateMerchantKhqrDTO(generateMerchantKhqrDTO: GenerateMerchantKhqrDTO): Promise<any> {}
}
