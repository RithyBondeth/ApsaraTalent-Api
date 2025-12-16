import { User } from '@app/common/database/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  CompanyResponseDTO,
  EmployeeResponseDTO,
  JobPositionDTO,
  UserResponseDTO,
} from '../dtos/user-response.dto';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { RpcException } from '@nestjs/microservices';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly empFavoriteCmpRepository: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly cmpFavoriteEmpRepository: Repository<CompanyFavoriteEmployee>,
    private readonly logger: PinoLogger,
  ) {}
  async findAllUsers(): Promise<UserResponseDTO[]> {
    try {
      const users = await this.userRepository.find({
        relations: [
          'employee',
          'employee.skills',
          'employee.experiences',
          'employee.educations',
          'employee.careerScopes',
          'employee.socials',
          'company',
          'company.openPositions',
          'company.careerScopes',
          'company.benefits',
          'company.values',
          'company.socials',
          'company.images',
        ],
      });
      if (!users)
        throw new RpcException({
          statusCode: 404,
          message: 'There are no users available!',
        });

      return users.map(
        (user) =>
          new UserResponseDTO({
            ...user,
            employee: user.employee
              ? new EmployeeResponseDTO(user.employee)
              : undefined,
            company: new CompanyResponseDTO({
              ...user.company,
              openPositions: user.company?.openPositions?.map(
                (job) => new JobPositionDTO(job),
              ),
            }),
          }),
      );
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while finding all the users.',
      });
    }
  }

  async findOneUserByID(userId: string): Promise<UserResponseDTO> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: [
          'employee',
          'employee.skills',
          'employee.experiences',
          'employee.educations',
          'employee.careerScopes',
          'employee.socials',
          'company',
          'company.openPositions',
          'company.careerScopes',
          'company.benefits',
          'company.values',
          'company.socials',
          'company.images',
        ],
      });
      if (!user)
        throw new RpcException({
          statusCode: 404,
          message: 'There is no user with this id!',
        });

      return new UserResponseDTO({
        ...user,
        employee: user.employee
          ? new EmployeeResponseDTO(user.employee)
          : undefined,
        company: new CompanyResponseDTO({
          ...user.company,
          openPositions: user.company?.openPositions?.map(
            (job) => new JobPositionDTO(job),
          ),
        }),
      });
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while finding user by id.',
      });
    }
  }

  async employeeFavoriteCompany(
    eid: string,
    cid: string,
  ): Promise<{ message: string }> {
    try {
      const exists = await this.empFavoriteCmpRepository.findOne({
        where: {
          employee: { id: eid },
          company: { id: cid },
        },
      });

      if (exists)
        throw new RpcException({
          statusCode: 404,
          message: 'Already favorite!',
        });

      const favorite = this.empFavoriteCmpRepository.create({
        employee: { id: eid },
        company: { id: cid },
      });

      await this.empFavoriteCmpRepository.save(favorite);

      return { message: 'Successfully added employee to favorite' };
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while favorite company by employee.',
      });
    }
  }

  async employeeUnfavoriteCompany(
    eid: string,
    cid: string,
    favoriteId: string,
  ): Promise<any> {
    try {
      const favoriteToRemove = await this.empFavoriteCmpRepository.findOne({
        where: {
          id: favoriteId,
          employee: { id: eid },
          company: { id: cid },
        },
      });

      if (!favoriteToRemove)
        throw new RpcException({
          message: "There's no company to remove from favorite.",
          statusCode: 404,
        });

      await this.empFavoriteCmpRepository.delete(favoriteToRemove);
      return { message: 'Successfully removed company from favorite' };
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while unfavorite company by employee.',
      });
    }
  }

  async companyUnfavoriteEmployee(
    cid: string,
    eid: string,
    favoriteId: string,
  ): Promise<any> {
    try {
      const favoriteToRemove = await this.cmpFavoriteEmpRepository.findOne({
        where: {
          id: favoriteId,
          company: { id: cid },
          employee: { id: eid },
        },
      });

      if (!favoriteToRemove)
        throw new RpcException({
          message: "There's no employee to remove from favorite.",
          statusCode: 404,
        });

      await this.cmpFavoriteEmpRepository.delete(favoriteToRemove);
      return { message: 'Successfully removed employee from favorite.' };
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while unfavorite employee by company.',
      });
    }
  }

  async companyFavoriteEmployee(
    cid: string,
    eid: string,
  ): Promise<{ message: string }> {
    try {
      const exists = await this.cmpFavoriteEmpRepository.findOne({
        where: {
          employee: { id: eid },
          company: { id: cid },
        },
      });

      if (exists)
        throw new RpcException({
          statusCode: 404,
          message: 'Already favorite',
        });

      const favorite = this.cmpFavoriteEmpRepository.create({
        employee: { id: eid },
        company: { id: cid },
      });

      await this.cmpFavoriteEmpRepository.save(favorite);

      return { message: 'Successfully added company to favorite' };
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while favorite employee by company.',
      });
    }
  }

  async findAllEmployeeFavorites(eid: string): Promise<any> {
    try {
      const allFavorites = await this.empFavoriteCmpRepository.find({
        where: { employee: { id: eid } },
        relations: ['company.openPositions'],
      });

      if (!allFavorites)
        throw new RpcException({
          statusCode: 404,
          message: 'There are no favorites',
        });

      const allFavoritesWithUsersId = await Promise.all(
        allFavorites.map(async (favorite) => {
          const user = await this.userRepository.findOne({
            where: {
              company: {
                id: favorite.company.id,
              },
            },
          });
          return { ...favorite, userId: user.id };
        }),
      );

      return allFavoritesWithUsersId;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while finding all employee favorites.',
      });
    }
  }

  async findAllCompanyFavorites(cid: string): Promise<any> {
    try {
      const allFavorites = await this.cmpFavoriteEmpRepository.find({
        where: { company: { id: cid } },
        relations: ['employee.skills'],
      });

      if (!allFavorites)
        throw new RpcException({
          statusCode: 404,
          message: 'There are no favorites',
        });

      const allFavoritesWithUserId = await Promise.all(
        allFavorites.map(async (favorite) => {
          const user = await this.userRepository.findOne({
            where: {
              employee: {
                id: favorite.employee.id,
              },
            },
          });
          return { ...favorite, userId: user.id };
        }),
      );

      return allFavoritesWithUserId;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while finding all company favorites.',
      });
    }
  }

  async countCompanyFavorite(cid: string): Promise<any> {
    try {
      const countAllCompanyFavorites =
        await this.cmpFavoriteEmpRepository.count({
          where: { company: { id: cid } },
        });
      return { totalFavorites: countAllCompanyFavorites };
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while counting all company favorites.',
      });
    }
  }

  async countEmployeeFavorite(eid: string): Promise<any> {
    try {
      const countAllEmployeeFavorites =
        await this.empFavoriteCmpRepository.count({
          where: { employee: { id: eid } },
        });
      return { totalFavorites: countAllEmployeeFavorites };
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while counting all employee favorites.',
      });
    }
  }

  async findAllCareerScopes(): Promise<Partial<CareerScope[]>> {
    try {
      const careerScopes = await this.careerScopeRepository.find();
      if (!careerScopes)
        throw new RpcException({
          statusCode: 404,
          message: 'No career scopes available!',
        });

      return careerScopes;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while finding all the career scopes.',
        statusCode: 500,
      });
    }
  }
}
