import { EGender } from "@app/common/enums/gender.enum";
import { EUserRole } from "@app/common/enums/user-role.enum";
import { Exclude, Type } from "class-transformer";

class UserProfileDTO {
    profile: string;   
    careerScopes: string[];
    bio: string;
    phone: string;
    gender: EGender;
    address: string;
    skills: string[];
    experience: string;
    portfolioUrl: string;
    linkedInUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    githubUrl:  string;
    cvFile: string;
    coverLetterFile: string;
    companyName: string;
    companyDescription: string;
    companyLogo: string;
    companyWebsite: string;
    industry: string;

    @Exclude()
    id: string;

    @Exclude()
    createdAt: Date;
    
    @Exclude()
    updatedAt: Date;
}

export class RegisterReponseDTO {
    id: string;
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    role: EUserRole;   

    @Exclude()
    password: string; 

    @Type(() => UserProfileDTO)
    profile: UserProfileDTO;

    @Exclude()
    resetPasswordToken: string;

    @Exclude()
    resetPasswordExpires: Date;

    @Exclude()
    facebookId: string;

    @Exclude()
    googleId: string;

    @Exclude()
    linkinId: string;

    @Exclude()
    githubId: string;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;

    constructor(partial: Partial<RegisterReponseDTO>) {
        return Object.assign(this, partial);
    }
}