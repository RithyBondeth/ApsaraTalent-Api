import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_SERVICE } from "utils/constants/user-service.constant";
import { UserService } from "../services/user.service";

@Controller()
export class UserController {
    constructor(private readonly userService: UserService) {}

    @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL)
    async findAllUsers() {
        return this.userService.findAllUsers();
    }

    @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID)  
    async findOneUserByID(@Payload() payload: { userId: string }) {
        return this.userService.findOneUserByID(payload.userId);
    }
}