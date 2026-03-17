<<<<<<< HEAD
import { RegisterReponseDTO } from "./register-response.dto";

export class LoginResponseDTO {
    message: string;
    accessToken: string;
    refreshToken: string;
    user: RegisterReponseDTO;

    constructor(partial: Partial<LoginResponseDTO>) {
        return Object.assign(this, partial);
    }
}  
=======
import { User } from '@app/common/database/entities/user.entity';

export class LoginResponseDTO {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;

  constructor(partial: Partial<LoginResponseDTO>) {
    return Object.assign(this, partial);
  }
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
