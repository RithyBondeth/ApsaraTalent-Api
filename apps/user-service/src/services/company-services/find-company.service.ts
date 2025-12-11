import { Company } from '@app/common/database/entities/company/company.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { UserPaginationDTO } from '../../dtos/user-pagination.dto';
import {
  CompanyResponseDTO,
  JobPositionDTO,
} from '../../dtos/user-response.dto';
import { RpcException } from '@nestjs/microservices';
import { User } from '@app/common/database/entities/user.entity';

@Injectable()
export class FindCompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
  ) {}

  async findAll(pagination: UserPaginationDTO): Promise<CompanyResponseDTO[]> {
    try {
      const companies = await this.companyRepository.find({
        relations: [
          'openPositions',
          'benefits',
          'values',
          'careerScopes',
          'socials',
          'images',
        ],
        skip: pagination?.skip || 0,
        take: pagination?.limit || 10,
      });
      if (!companies)
        throw new RpcException({
          message: 'There are no companies available.',
          statusCode: 404,
        });

      return companies.map((company) => {
        const transformedCompany = {
          ...company,
          openPositions:
            company.openPositions?.map((job) => new JobPositionDTO(job)) ?? [],
        };
        return new CompanyResponseDTO(transformedCompany);
      });
    } catch (error) {
      //Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching all of the companies.',
        statusCode: 500,
      });
    }
  }

  async findOneById(companyId: string): Promise<CompanyResponseDTO> {
    try {
      const user = await this.userRepository.findOne({
        where: {
          company: {
            id: companyId,
          },
        },
        relations: [
          'company.openPositions',
          'company.benefits',
          'company.values',
          'company.careerScopes',
          'company.socials',
          'company.images',
        ],
      });
      
      return new CompanyResponseDTO({
        ...user.company,
        email: user.email,
        openPositions:
          user.company.openPositions?.map((job) => new JobPositionDTO(job)) ?? [],
      });
    } catch (error) {
      //Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching a company.',
        statusCode: 500,
      });
    }
  }
}
