import { IsObject, IsUUID } from 'class-validator';

export class AiMatchProfilesDTO {
  @IsUUID()
  eid: string;

  @IsUUID()
  cid: string;

  constructor(partial: Partial<AiMatchProfilesDTO>) {
    Object.assign(this, partial);
  }
}

export class AiMatchProfilesResponseDTO {
  @IsObject()
  employeeProfile: any;

  @IsObject()
  companyProfile: any;

  constructor(partial: Partial<AiMatchProfilesResponseDTO>) {
    Object.assign(this, partial);
  }
}
