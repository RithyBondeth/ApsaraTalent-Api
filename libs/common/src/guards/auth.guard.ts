import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "../jwt/jwt.service";
import { IPayload } from "../jwt/interfaces/payload.interface";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../database/entities/user.entity";
import { Repository } from "typeorm";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) {}
    
    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const token = request.cookies?.['auth-token'] || request.headers?.authorization?.split('Bearer ')[1]; 
        
        if (!token) {
            throw new RpcException("There's no token");
        }

        try {
            const payload: IPayload = await this.jwtService.verifyToken(token);
            const user = await this.userRepository.findOne({ where: { id: payload.id } });

            if (!user) {
                throw new RpcException("User not found");
            }

            return true;
        } catch (error) {
            throw new RpcException("Invalid Token or Insufficient permissions");
        }
    }
}