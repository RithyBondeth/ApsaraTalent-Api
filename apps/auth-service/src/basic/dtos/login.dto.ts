<<<<<<< HEAD
import { IsEmail, IsNotEmpty, IsStrongPassword } from "class-validator";

export class LoginDTO {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsStrongPassword()
    @IsNotEmpty()
    password: string;
}
=======
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class LoginDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
