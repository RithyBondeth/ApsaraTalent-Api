import { User } from "@app/common/database/entities/user.entity";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly logger: PinoLogger,
    ) {}
    async findAllUsers() {
       try {
            const users = await this.userRepository.find({ relations: ['employee', 'company'] });
            if(!users) throw new NotFoundException('There are no users available');

            return users;
       } catch (error) {
            //Handle errors
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while fetching all users.");
        }
    }

    async findOneUserByID(userId: string) {
        try {
            const user = await this.userRepository.findOne({ 
                relations: ['employee', 'company'], 
                where: { id: userId }
            });
            if(!user) throw new NotFoundException(`There is no user with ID ${userId}`);

            return user;
       } catch (error) {
            //Handle errors
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while fetching a user.");
        }
    }
}