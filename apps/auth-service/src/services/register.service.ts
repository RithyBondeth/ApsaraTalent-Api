import { Injectable } from "@nestjs/common";
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

    register(registerDTO: RegisterDTO) {
        // Perform user registration logic here
    }
}