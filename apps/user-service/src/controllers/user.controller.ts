import { IUserController } from '@app/contracts/interfaces/controller/user-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  CountAllUsersResponseDTO,
  UserResponseDTO,
  CompanyResponseDTO,
  EmployeeResponseDTO,
  FavoriteCountResponseDTO,
} from '@app/contracts/dtos/user';

import {
  I_USER_SERVICE,
  IUserService,
} from '@app/contracts/interfaces/service/user-service.interface';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';

@Controller()
export class UserController implements IUserController {
  constructor(
    @Inject(I_USER_SERVICE) private readonly userService: IUserService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL)
  async findAllUsers(
    @Payload() payload: { skip?: number; limit?: number },
  ): Promise<UserResponseDTO[]> {
    return this.userService.findAllUsers(payload?.skip, payload?.limit);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_ALL_USERS)
  async countAllUsers(): Promise<CountAllUsersResponseDTO> {
    return this.userService.countAllUsers();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID)
  async findOneUserById(
    @Payload() payload: { userId: string },
  ): Promise<UserResponseDTO> {
    return this.userService.findOneUserByID(payload.userId);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_CURRENT_USER)
  async getCurrentUser(
    @Payload() payload: { userID: string },
  ): Promise<UserResponseDTO> {
    return this.userService.findOneUserByID(payload.userID);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_PUSH_TOKEN)
  async updatePushNotificationToken(
    @Payload() payload: { userId: string; token: string | null },
  ): Promise<CoreResponseDTO> {
    return this.userService.updatePushNotificationToken(
      payload.userId,
      payload.token,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADD_COMPANY_TO_FAVORITE)
  async employeeFavoriteCompany(
    @Payload() payload: { eid: string; cid: string },
  ): Promise<CoreResponseDTO> {
    return this.userService.employeeFavoriteCompany(payload.eid, payload.cid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE)
  async employeeUnfavoriteCompany(
    @Payload() payload: { eid: string; cid: string; favoriteId: string },
  ): Promise<CoreResponseDTO> {
    return this.userService.employeeUnfavoriteCompany(
      payload.eid,
      payload.cid,
      payload.favoriteId,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE)
  async companyUnfavoriteEmployee(
    @Payload() payload: { cid: string; eid: string; favoriteId: string },
  ): Promise<CoreResponseDTO> {
    return this.userService.companyUnfavoriteEmployee(
      payload.cid,
      payload.eid,
      payload.favoriteId,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADD_EMPLOYEE_TO_FAVORITE)
  async companyFavoriteEmployee(
    @Payload() payload: { eid: string; cid: string },
  ): Promise<CoreResponseDTO> {
    return this.userService.companyFavoriteEmployee(payload.cid, payload.eid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE_FAVORITE)
  async findAllEmployeeFavorite(
    @Payload() payload: { eid: string },
  ): Promise<CompanyResponseDTO[]> {
    return this.userService.findAllEmployeeFavorites(payload.eid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY_FAVORITE)
  async findAllCompanyFavorite(
    @Payload() payload: { cid: string },
  ): Promise<EmployeeResponseDTO[]> {
    return this.userService.findAllCompanyFavorites(payload.cid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_COMPANY_FAVORITE)
  async countCompanyFavorite(
    @Payload() payload: { cid: string },
  ): Promise<FavoriteCountResponseDTO> {
    return this.userService.countCompanyFavorite(payload.cid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_EMPLOYEE_FAVORITE)
  async countEmployeeFavorite(
    @Payload() payload: { eid: string },
  ): Promise<FavoriteCountResponseDTO> {
    return this.userService.countEmployeeFavorite(payload.eid);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_CAREER_SCOPES)
  async findAllCareerScopes(): Promise<any[]> {
    return this.userService.findAllCareerScopes();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE)
  async clearUserCache(@Payload() payload: { userId: string }): Promise<void> {
    return this.userService.clearCurrentUserCache(payload.userId);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_EMPLOYEE_RECOMMENDATIONS)
  async getEmployeeRecommendations(
    @Payload() payload: { employeeId: string; limit?: number },
  ): Promise<CompanyResponseDTO[]> {
    return this.userService.getEmployeeRecommendations(
      payload.employeeId,
      payload.limit,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_COMPANY_RECOMMENDATIONS)
  async getCompanyRecommendations(
    @Payload() payload: { companyId: string; limit?: number },
  ): Promise<EmployeeResponseDTO[]> {
    return this.userService.getCompanyRecommendations(
      payload.companyId,
      payload.limit,
    );
  }
}
