import { IsIn, IsUUID } from 'class-validator';

export class EmployeeMatchingLookupDTO {
  @IsUUID()
  eid: string;
}

export class CompanyMatchingLookupDTO {
  @IsUUID()
  cid: string;
}

export class MatchingAnalyticsDTO {
  @IsUUID()
  userId: string;

  @IsIn(['employee', 'company'])
  role: 'employee' | 'company';
}
