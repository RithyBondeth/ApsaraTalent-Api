<<<<<<< HEAD
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshTokenDTO {
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}
=======
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDTO {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
