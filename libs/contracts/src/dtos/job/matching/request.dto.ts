import { IsIn, IsUUID } from 'class-validator';

export class EmployeeMatchLookupDTO {
  @IsUUID()
  eid: string;
}

export class CompanyMatchLookupDTO {
  @IsUUID()
  cid: string;
}

export class MatchAnalyticsRequestDTO {
  @IsUUID()
  userId: string;

  @IsIn(['employee', 'company'])
  role: 'employee' | 'company';
}
