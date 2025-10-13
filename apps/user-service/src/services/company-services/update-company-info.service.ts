import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdateCompanyInfoDTO } from '../../dtos/company/update-company-info.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Repository } from 'typeorm';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { PinoLogger } from 'nestjs-pino';
import {
  CompanyResponseDTO,
  JobPositionDTO,
} from '../../dtos/user-response.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class UpdateCompanyInfoService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Benefit)
    private readonly benefitRepository: Repository<Benefit>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(Social)
    private readonly socialRepository: Repository<Social>,
    private readonly logger: PinoLogger,
  ) {}

  async updateCompanyInfo(
    updateCompanyInfoDTO: UpdateCompanyInfoDTO,
    companyId: string,
  ): Promise<{ message: string; company: CompanyResponseDTO }> {
    try {
      // Find existing company with relations
      let company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: [
          'benefits',
          'values',
          'openPositions',
          'careerScopes',
          'socials',
        ],
      });

      if (!company)
        throw new RpcException({
          message: 'There is no company with this ID.',
          statusCode: 401,
        });

      // Merge new values into existing fields
      Object.assign(company, updateCompanyInfoDTO);

      // Merge and update relations
      if (updateCompanyInfoDTO.benefits) {
        const existingBenefits = await this.benefitRepository.findBy({
          companies: { id: companyId },
        });
        const newBenefits = updateCompanyInfoDTO.benefits.map((benefit) =>
          this.benefitRepository.create(benefit),
        );
        company.benefits = [...existingBenefits, ...newBenefits];
        await this.benefitRepository.save(newBenefits);
      }

      if (updateCompanyInfoDTO.values) {
        const existingValues = await this.valueRepository.findBy({
          companies: { id: companyId },
        });
        const newValues = updateCompanyInfoDTO.values.map((value) =>
          this.valueRepository.create(value),
        );
        company.values = [...existingValues, ...newValues];
        await this.valueRepository.save(newValues);
      }

      if (updateCompanyInfoDTO.jobs) {
        const updatedJobs = [];

        for (const jobDto of updateCompanyInfoDTO.jobs) {
          if (jobDto.id) {
            const existingJob = await this.jobRepository.findOne({
              where: { id: jobDto.id, company: { id: companyId } },
            });

            if (existingJob) {
              Object.assign(existingJob, jobDto);
              const saved = await this.jobRepository.save(existingJob);
              updatedJobs.push(saved);
            }
          } else {
            const newJob = this.jobRepository.create({
              ...jobDto,
              company,
            });
            const saved = await this.jobRepository.save(newJob);
            updatedJobs.push(saved);
          }
        }

        if(updateCompanyInfoDTO.jobIdsToDelete?.length > 0) {
            await this.jobRepository.delete(updateCompanyInfoDTO.jobIdsToDelete);   
        }

        // Refresh to get current state
        company.openPositions = await this.jobRepository.find({
          where: { company: { id: companyId } },
        });
      }

      if (updateCompanyInfoDTO.careerScopes) {
        const existingCareerScopes = await this.careerScopeRepository.findBy({
          companies: { id: companyId },
        });
        const newCareerScopes = updateCompanyInfoDTO.careerScopes.map((cs) =>
          this.careerScopeRepository.create(cs),
        );
        company.careerScopes = [...existingCareerScopes, ...newCareerScopes];
        await this.careerScopeRepository.save(newCareerScopes);
      }

      if (updateCompanyInfoDTO.socials) {
        const existingSocials = await this.socialRepository.findBy({
          company: { id: companyId },
        });
        const newSocials = updateCompanyInfoDTO.socials.map((social) =>
          this.socialRepository.create(social),
        );
        company.socials = [...existingSocials, ...newSocials];
        await this.socialRepository.save(newSocials);
      }

      // Save updated company entity
      await this.companyRepository.save(company);

      return {
        message: 'Company information updated successfully',
        company: new CompanyResponseDTO({
          ...company,
          openPositions: company.openPositions?.map(
            (job) => new JobPositionDTO(job),
          ),
        }),
      };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while updating the company's information.",
        statusCode: 500,
      });
    }
  }
}
