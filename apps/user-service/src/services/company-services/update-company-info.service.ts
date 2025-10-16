import { Injectable } from '@nestjs/common';
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
        const updatedBenefits = [];

        for (const benefitDto of updateCompanyInfoDTO.benefits) {
          if (benefitDto.id) {
            const existingBenefit = await this.benefitRepository.findOne({
              where: { id: benefitDto.id, companies: { id: companyId } },
            });

            if (existingBenefit) {
              const { id, ...updateData } = benefitDto;
              Object.assign(existingBenefit, updateData);
              const saved = await this.benefitRepository.save(existingBenefit);
              updatedBenefits.push(saved);
            }
          }
          if (benefitDto.id === undefined) {
            const newBenefit = this.benefitRepository.create({
              ...benefitDto,
              companies: [company],
            });
            const saved = await this.benefitRepository.save(newBenefit);
            updatedBenefits.push(saved);
          }
        }

        if (updateCompanyInfoDTO.benefitIdsToDelete?.length > 0) {
          // First, remove the relationship from the company
          const companyWithBenefits = await this.companyRepository.findOne({
            where: { id: companyId },
            relations: ['benefits'],
          });

          // Filter out the benefits to be deleted
          companyWithBenefits.benefits = companyWithBenefits.benefits.filter(
            (benefit) =>
              !updateCompanyInfoDTO.benefitIdsToDelete.includes(benefit.id),
          );

          // Save the company (this removes the relationship in junction table)
          await this.companyRepository.save(companyWithBenefits);

          // Now safely delete the benefits
          for (const benefitIdsToDelete of updateCompanyInfoDTO.benefitIdsToDelete) {
            await this.benefitRepository.delete(benefitIdsToDelete);
          }
        }

        // Refresh to get current state
        company.benefits = await this.benefitRepository.find({
          where: { companies: { id: companyId } },
        });
      }

      if (updateCompanyInfoDTO.values) {
        const updateValues = [];

        for (const valueDto of updateCompanyInfoDTO.values) {
          if (valueDto.id) {
            const existingValue = await this.valueRepository.findOne({
              where: { id: valueDto.id, companies: { id: companyId } },
            });

            if (existingValue) {
              const { id, ...updateData } = valueDto;
              Object.assign(existingValue, updateData);
              const saved = await this.valueRepository.save(existingValue);
              updateValues.push(saved);
            }
          }
          if (valueDto.id === undefined) {
            const newValue = this.valueRepository.create({
              ...valueDto,
              companies: [company],
            });
            const saved = await this.valueRepository.save(newValue);
            updateValues.push(saved);
          }
        }

        if (updateCompanyInfoDTO.valueIdsToDelete?.length > 0) {
          // First, remove the relationship from the company
          const companyWithValues = await this.companyRepository.findOne({
            where: { id: companyId },
            relations: ['values'],
          });

          // Filter out the values to be deleted
          companyWithValues.values = companyWithValues.values.filter(
            (value) =>
              !updateCompanyInfoDTO.valueIdsToDelete.includes(value.id),
          );

          // Save the company (this removes the relationship in junction table)
          await this.companyRepository.save(companyWithValues);

          // Now safely delete the values
          for (const valueIdToDelete of updateCompanyInfoDTO.valueIdsToDelete) {
            await this.valueRepository.delete(valueIdToDelete);
          }
        }

        // Refresh to get current state
        company.values = await this.valueRepository.find({
          where: { companies: { id: companyId } },
        });
      }

      if (updateCompanyInfoDTO.jobs) {
        const updatedJobs = [];

        for (const jobDto of updateCompanyInfoDTO.jobs) {
          if (jobDto.id !== null && jobDto.id !== '') {
            const existingJob = await this.jobRepository.findOne({
              where: { id: jobDto.id, company: { id: companyId } },
            });

            if (existingJob) {
              // Remove id from jobDto to avoid conflicts
              const { id, ...updateData } = jobDto;
              Object.assign(existingJob, updateData);
              const saved = await this.jobRepository.save(existingJob);
              updatedJobs.push(saved);
            }
          }
          if (jobDto.id === undefined) {
            const newJob = this.jobRepository.create({
              ...jobDto,
              company,
            });
            const saved = await this.jobRepository.save(newJob);
            updatedJobs.push(saved);
          }
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
