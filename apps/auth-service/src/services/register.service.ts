import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { RegisterDTO } from "../dtos/register.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "@app/common/database/entities/user.entity";
import { Repository } from "typeorm";
import { JwtService } from "@app/common/jwt/jwt.service";
import * as path from "path";
import { UploadfileService } from "@app/common/uploadfile/uploadfile.service";
import { ConfigService } from "@nestjs/config";
import { UserProfile } from "@app/common/database/entities/user-profile.entity";
import { Career } from "@app/common/database/entities/career.entity";

@Injectable()
export class RegisterService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(UserProfile) private readonly userProfileRepository: Repository<UserProfile>,
        private readonly uploadFileService: UploadfileService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async register(registerDTO: RegisterDTO) {
        try {
            //Find if the user has already registered (username)
            let user = await this.userRepository.findOne({ 
                where: { username: registerDTO.username },
                relations: ['profile']
            });
            if(user) {
                //Cleanup the profile image if the user has already registered
                if(registerDTO.profile) {
                    const profilePath = path.join(process.cwd(), 'storage/auth-service/profiles', registerDTO.profile.filename); 
                    UploadfileService.deleteFile(profilePath, 'Avatar Image');     
                }
                throw new NotFoundException(`User with username ${registerDTO.username} is already registered`);
            }  
            
            //Handle profile image upload
            let profileImage = null;
            if(registerDTO.profile)
                profileImage = this.uploadFileService.getUploadFile('user-profiles', registerDTO.profile);
            else 
                profileImage = this.configService.get<string>("BASE_URL") + this.configService.get<string>('DEFAULT_PROFILE');

            //Register user in database            
            user = this.userRepository.create({
                ...registerDTO,
                profile: this.userProfileRepository.create({ 
                    profile: profileImage,
                    careerScopes: registerDTO.careerScopes.split(' '),
                })
            });
            await this.userRepository.save(user);

            //Return user profile
            return user;
        } catch (error) {
            //Handle error
            console.error(error.message);  
            throw new InternalServerErrorException("An error occurred while registering the user.");
        }
    }
}