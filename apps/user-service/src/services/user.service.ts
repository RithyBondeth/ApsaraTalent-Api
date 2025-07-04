import { User } from '@app/common/database/entities/user.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { CompanyResponseDTO, JobPositionDTO, UserResponseDTO } from '../dtos/user-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
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
          'company.images'
        ],
      });
      if (!users) throw new NotFoundException('There are no users available');
      
      return users.map((user) => new UserResponseDTO({
        ...user,
        company: new CompanyResponseDTO({
          ...user.company,
          openPositions: user.company?.openPositions?.map(job => new JobPositionDTO(job))
        })
      }));
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
            'company.images'
        ],
      });
      if (!user)
        throw new NotFoundException(`There is no user with ID ${userId}`);

      return new UserResponseDTO({
        ...user,
        company: new CompanyResponseDTO({
            ...user.company,
            openPositions: user.company?.openPositions?.map(job => new JobPositionDTO(job))
          })
      });
    } catch (error) {
      //Handle errors
      this.logger.error(error.message);
      throw new BadRequestException('An error occurred while fetching a user.');
    }
  }

  async getUserByIdForChat(id: string) {
    return this.userRepository.findOne({ 
      where: { id },
      select: ['id', 'email', 'role']
    });
  }
}
