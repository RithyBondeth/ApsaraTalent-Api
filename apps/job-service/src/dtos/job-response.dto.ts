import { Exclude, Expose, Type } from "class-transformer";
import { IsNumber, IsString } from "class-validator";
import { formatDateToDDMMYYYY } from "utils/functions/date-formatter";

export class CompanyInJobResponseDTO {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @Exclude()
    description: string;

    @Exclude()
    phone: string;

    @IsString()
    avatar: string;

    @Exclude()
    cover: string;

    @IsNumber()
    companySize: number;

    @IsString()
    industry: string;

    @IsString()
    location: string;

    @Exclude()
    foundedYear: number;

    @Exclude()
    createdAt: Date;   
    
    constructor(partial: Partial<CompanyInJobResponseDTO>) {
        return Object.assign(this, partial)
    }
}

export class JobResponseDTO {
    @IsString()
    id: string;

    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsString()
    type: string;

    @Exclude()
    experienceRequired: string;

    @Expose()
    get experience(): string {
        return this.experienceRequired;
    }

    @Exclude()
    educationRequired: string;

    @Expose()
    get education(): string {
        return this.educationRequired;
    }

    @Exclude()
    skillsRequired: string;

    @Expose()
    get skills(): string[] {
        return this.skillsRequired.split(",").map((skill) => skill.trim());
    }

    @IsString()
    salary: string;
    
    @Exclude()
    expireDate: Date;

    @Expose()
    get deadlineDate(): string | null {
        return this.expireDate ? formatDateToDDMMYYYY(this.expireDate) : null;
    }

    @Exclude()
    createdAt: Date;

    @Expose() 
    get postedDate(): string | null {
        return this.createdAt ? formatDateToDDMMYYYY(this.createdAt) : null;
    }

    @Type(() => CompanyInJobResponseDTO)
    company: CompanyInJobResponseDTO;
    
    constructor(partial: Partial<JobResponseDTO>) {
        return Object.assign(this, partial)
    }
}