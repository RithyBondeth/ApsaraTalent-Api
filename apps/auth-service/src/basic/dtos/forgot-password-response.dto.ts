<<<<<<< HEAD
import { IsString } from "class-validator";

export class ForgotPasswordResponseDTO {
    @IsString()
    message: string;

    constructor(message: string) {
        this.message = message;
    }
}
=======
import { IsString } from 'class-validator';

export class ForgotPasswordResponseDTO {
  @IsString()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
