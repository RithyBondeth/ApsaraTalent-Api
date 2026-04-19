import { IsUUID } from 'class-validator';
import { CreateInterviewResponseDTO } from './create-interview.dto';

export class GetInterviewsByEmployeeDTO {
  @IsUUID()
  employeeId: string;
}

export class GetInterviewsByCompanyDTO {
  @IsUUID()
  companyId: string;
}

export class GetInterviewResponseDTO extends CreateInterviewResponseDTO {
  constructor(partial: Partial<GetInterviewResponseDTO>) {
    super(partial);
    Object.assign(this, partial);
  }
}
