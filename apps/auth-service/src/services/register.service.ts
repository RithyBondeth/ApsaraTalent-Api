import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { RegisterDTO } from "../dtos/register.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "@app/common/database/entities/user.entity";
import { Repository } from "typeorm";
import { JwtService } from "@app/common/jwt/jwt.service";

@Injectable()
export class RegisterService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) {}

    async register(registerDTO: RegisterDTO) {
        try {
            const user = await this.userRepository.findOne({ where: { username: registerDTO.username } });
            if(user) throw new NotFoundException(`User with username ${registerDTO.username} is already registered`);

            const newUser = this.userRepository.create(registerDTO);

        } catch (error) {
            console.error(error.message);  
            throw new InternalServerErrorException("An error occurred while registering the user.");
        }
    }
}