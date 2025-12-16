import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UserService } from '../services/user.service';
import { UserResponseDTO } from '../dtos/user-response.dto';
import { IUserController } from '@app/common/interfaces/user-controller.interface';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';

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
  async getCurrentUser(@Payload() payload: { userID: string }): Promise<any> {
    return this.userService.findOneUserByID(payload.userID);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADD_COMPANY_TO_FAVORITE)
  async employeeFavoriteCompany(
    @Payload() payload: { eid: string; cid: string },
  ): Promise<any> {
    return this.userService.employeeFavoriteCompany(payload.eid, payload.cid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE)
  async employeeUnfavoriteCompany(
    @Payload() payload: { eid: string; cid: string; favoriteId: string },
  ): Promise<any> {
    return this.userService.employeeUnfavoriteCompany(
      payload.eid,
      payload.cid,
      payload.favoriteId,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE)
  async companyUnfavoriteEmployee(
    @Payload() payload: { cid: string; eid: string; favoriteId: string },
  ): Promise<any> {
    return this.userService.companyUnfavoriteEmployee(
      payload.cid,
      payload.eid,
      payload.favoriteId,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADD_EMPLOYEE_TO_FAVORITE)
  async companyFavoriteEmployee(
    @Payload() payload: { eid: string; cid: string },
  ): Promise<any> {
    return this.userService.companyFavoriteEmployee(payload.cid, payload.eid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE_FAVORITE)
  async findAllEmployeeFavorite(
    @Payload() payload: { eid: string },
  ): Promise<any> {
    return this.userService.findAllEmployeeFavorites(payload.eid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY_FAVORITE)
  async findAllCompanyFavorite(
    @Payload() payload: { cid: string },
  ): Promise<any> {
    return this.userService.findAllCompanyFavorites(payload.cid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_COMPANY_FAVORITE)
  async countCompanyFavorite(
    @Payload() payload: { cid: string },
  ): Promise<any> {
    return this.userService.countCompanyFavorite(payload.cid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_EMPLOYEE_FAVORITE)
  async countEmployeeFavorite(
    @Payload() payload: { eid: string },
  ): Promise<any> {
    return this.userService.countEmployeeFavorite(payload.eid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_CAREER_SCOPES)
  async findAllCareerScopes(): Promise<Partial<CareerScope[]>> {
    return this.userService.findAllCareerScopes();
  }
}
