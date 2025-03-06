import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { RegisterGoogleEmployeeDTO } from './google-register-employee.dto';
import { RegisterGoogleCompanyDTO } from './google-register-company.dto';

export class RegisterGoogleUserDTO {
    @IsEnum(EUserRole)
    role: EUserRole;

    @IsOptional()
    @ValidateNested()
    @Type(() => RegisterGoogleEmployeeDTO)
    employeeData?: RegisterGoogleEmployeeDTO;  

    @IsOptional()
    @ValidateNested()
    @Type(() => RegisterGoogleCompanyDTO)
    companyData?: RegisterGoogleCompanyDTO; 
}