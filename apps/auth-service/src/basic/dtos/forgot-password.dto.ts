<<<<<<< HEAD
import { IsEmail, IsNotEmpty } from "class-validator";

export class ForgotPasswordDTO {
    @IsEmail()
    @IsNotEmpty()
    email: string;   
}
=======
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDTO {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
