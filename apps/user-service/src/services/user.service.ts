import { User } from '@app/common/database/entities/user.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly empFavoriteCmp: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly cmpFavoriteEmp: Repository<CompanyFavoriteEmployee>,
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
      if (!users) throw new NotFoundException('There are no users available');

      return users.map(
        (user) =>
          new UserResponseDTO({
            ...user,
            employee: user.employee ? new EmployeeResponseDTO(user.employee) : undefined,
            company: new CompanyResponseDTO({
              ...user.company,
              openPositions: user.company?.openPositions?.map(
                (job) => new JobPositionDTO(job),
              ),
            }),
          }),
      );
    } catch (error) {
      //Handle errors
      this.logger.error(error.message);
      throw new BadRequestException(
        'An error occurred while fetching all users.',
      );
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
        throw new NotFoundException(`There is no user with ID ${userId}`);

      return new UserResponseDTO({
        ...user,
        employee: user.employee ? new EmployeeResponseDTO(user.employee) : undefined,
        company: new CompanyResponseDTO({
          ...user.company,
          openPositions: user.company?.openPositions?.map(
            (job) => new JobPositionDTO(job),
          ),
        }),
      });
    } catch (error) {
      //Handle errors
      this.logger.error(error.message);
      throw new BadRequestException('An error occurred while fetching a user.');
    }
  }

  async employeeFavoriteCompany(eid: string, cid: string) {
    const exists = await this.empFavoriteCmp.findOne({
      where: {
        employee: { id: eid },
        company: { id: cid },
      },
    });

    if (exists)
      throw new RpcException({ statusCode: 401, message: 'Already favorite' });

    const favorite = this.empFavoriteCmp.create({
      employee: { id: eid },
      company: { id: cid },
    });

    await this.empFavoriteCmp.save(favorite);

    return { message: 'Successfully added employee to favorite' };
  }

  async companyFavoriteEmployee(cid: string, eid: string) {
    const exists = await this.cmpFavoriteEmp.findOne({
      where: {
        employee: { id: eid },
        company: { id: cid },
      },
    });

    if (exists)
      throw new RpcException({ statusCode: 401, message: 'Already favorite' });

    const favorite = this.cmpFavoriteEmp.create({
      employee: { id: eid },
      company: { id: cid },
    });

    await this.cmpFavoriteEmp.save(favorite);

    return { message: 'Successfully added company to favorite' };
  }

  async findAllEmployeeFavorites(eid: string) {
    const allFavorites = await this.empFavoriteCmp.find({ 
      where: { employee: { id: eid } },
      relations: ['company.openPositions'],
    });

    if(!allFavorites) 
      throw new RpcException({ statusCode: 401, message: 'There are no favorites' }); 
      
    return allFavorites;
  }

  async findAllCompanyFavorites(cid: string) {
    const allFavorites = await this.cmpFavoriteEmp.find({ 
      where: { company: { id: cid } },
      relations: ['employee.skills']
    });

    if(!allFavorites) 
      throw new RpcException({ statusCode: 401, message: 'There are no favorites' }); 
      
    return allFavorites;
  }

  async getUserByIdForChat(id: string) {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'role'],
    });
  }
}
