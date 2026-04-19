
export class CountAllUsersResponseDTO {
  totalUsers?: number;
  totalEmployees?: number;
  totalCompanies?: number;

  constructor(partial: Partial<CountAllUsersResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class CountAllUsersDTO {}
