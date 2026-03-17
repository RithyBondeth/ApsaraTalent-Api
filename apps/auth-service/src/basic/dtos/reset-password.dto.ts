<<<<<<< HEAD
import { IsNotEmpty, IsOptional, IsString, IsStrongPassword } from "class-validator";

export class ResetPasswordDTO {
    @IsStrongPassword()
    @IsNotEmpty()
    newPassword: string;

    @IsStrongPassword()
    @IsNotEmpty()
    confirmPassword: string;

    @IsString()
    @IsOptional()
    token?: string;
}
=======
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsStrongPassword
} from 'class-validator';

export class ResetPasswordDTO {
  @IsStrongPassword()
  @IsNotEmpty()
  newPassword: string;

  @IsStrongPassword()
  @IsNotEmpty()
  confirmPassword: string;

  @IsString()
  @IsOptional()
  token?: string;
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
