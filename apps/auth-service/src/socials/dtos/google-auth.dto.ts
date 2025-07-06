import { IsEmail, IsString, IsUrl } from 'class-validator';

export class GoogleAuthDTO {
    @IsString()
    id: string;

    @IsEmail()
    email: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsUrl()
    picture: string;
}
