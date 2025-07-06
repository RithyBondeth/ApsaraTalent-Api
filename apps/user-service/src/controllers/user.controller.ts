import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UserService } from '../services/user.service';
import { UserResponseDTO } from '../dtos/user-response.dto';
import { IUserController } from '@app/common/interfaces/user-controller.interface';

@Controller()
export class UserController implements IUserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL)
  async findAllUsers(): Promise<UserResponseDTO[]> {
    return this.userService.findAllUsers();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID)
  async findOneUserById(
    @Payload() payload: { userId: string },
  ): Promise<UserResponseDTO> {
    return this.userService.findOneUserByID(payload.userId);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_CURRENT_USER)
  async getCurrentUser(@Payload() payload: { userID: string }) {
    return this.userService.findOneUserByID(payload.userID);
  }

  @MessagePattern('getUserByIdForChat')
  async getUserById(id: string) {
    return this.userService.getUserByIdForChat(id);
  }
}
