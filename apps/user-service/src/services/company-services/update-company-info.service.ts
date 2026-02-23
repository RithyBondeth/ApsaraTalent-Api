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
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';

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
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  // async updateCompanyInfo(
  //   updateCompanyInfoDTO: UpdateCompanyInfoDTO,
  //   companyId: string,
  // ): Promise<{ message: string; company: CompanyResponseDTO }> {
  //   try {
  //     // Find existing company with relations
  //     let company = await this.companyRepository.findOne({
  //       where: { id: companyId },
  //       relations: [
  //         'benefits',
  //         'values',
  //         'openPositions',
  //         'careerScopes',
  //         'socials',
  //       ],
  //     });

  //     if (!company)
  //       throw new RpcException({
  //         message: 'There is no company with this ID.',
  //         statusCode: 404,
  //       });

  //     // Merge new values into existing fields
  //     Object.assign(company, updateCompanyInfoDTO);

  //     // Merge and update relations
  //     if (updateCompanyInfoDTO.benefits) {
  //       const updatedBenefits = [];

  //       for (const benefitDto of updateCompanyInfoDTO.benefits) {
  //         if (benefitDto.id) {
  //           const existingBenefit = await this.benefitRepository.findOne({
  //             where: { id: benefitDto.id, companies: { id: companyId } },
  //           });

  //           if (existingBenefit) {
  //             const { id, ...updateData } = benefitDto;
  //             Object.assign(existingBenefit, updateData);
  //             const saved = await this.benefitRepository.save(existingBenefit);
  //             updatedBenefits.push(saved);
  //           }
  //         }
  //         if (benefitDto.id === undefined) {
  //           const newBenefit = this.benefitRepository.create({
  //             ...benefitDto,
  //             companies: [company],
  //           });
  //           const saved = await this.benefitRepository.save(newBenefit);
  //           updatedBenefits.push(saved);
  //         }
  //       }

  //       if (updateCompanyInfoDTO.benefitIdsToDelete?.length > 0) {
  //         const companyWithBenefits = await this.companyRepository.findOne({
  //           where: { id: companyId },
  //           relations: ['benefits'],
  //         });

  //         // Just unlink — don't delete from table
  //         companyWithBenefits.benefits = companyWithBenefits.benefits.filter(
  //           (benefit) =>
  //             !updateCompanyInfoDTO.benefitIdsToDelete.includes(benefit.id),
  //         );

  //         await this.companyRepository.save(companyWithBenefits);
  //       }

  //       // Refresh to get current state
  //       company.benefits = await this.benefitRepository.find({
  //         where: { companies: { id: companyId } },
  //       });
  //     }

  //     if (updateCompanyInfoDTO.values) {
  //       const updateValues = [];

  //       for (const valueDto of updateCompanyInfoDTO.values) {
  //         if (valueDto.id) {
  //           const existingValue = await this.valueRepository.findOne({
  //             where: { id: valueDto.id, companies: { id: companyId } },
  //           });

  //           if (existingValue) {
  //             const { id, ...updateData } = valueDto;
  //             Object.assign(existingValue, updateData);
  //             const saved = await this.valueRepository.save(existingValue);
  //             updateValues.push(saved);
  //           }
  //         }
  //         if (valueDto.id === undefined) {
  //           const newValue = this.valueRepository.create({
  //             ...valueDto,
  //             companies: [company],
  //           });
  //           const saved = await this.valueRepository.save(newValue);
  //           updateValues.push(saved);
  //         }
  //       }

  //       if (updateCompanyInfoDTO.valueIdsToDelete?.length > 0) {
  //         // First, remove the relationship from the company
  //         const companyWithValues = await this.companyRepository.findOne({
  //           where: { id: companyId },
  //           relations: ['values'],
  //         });

  //         // Filter out the values to be deleted
  //         companyWithValues.values = companyWithValues.values.filter(
  //           (value) =>
  //             !updateCompanyInfoDTO.valueIdsToDelete.includes(value.id),
  //         );

  //         // Save the company (this removes the relationship in junction table)
  //         await this.companyRepository.save(companyWithValues);
  //       }

  //       // Refresh to get current state
  //       company.values = await this.valueRepository.find({
  //         where: { companies: { id: companyId } },
  //       });
  //     }

  //     if (updateCompanyInfoDTO.jobs) {
  //       const updatedJobs = [];

  //       for (const jobDto of updateCompanyInfoDTO.jobs) {
  //         if (jobDto.id) {
  //           const existingJob = await this.jobRepository.findOne({
  //             where: { id: jobDto.id, company: { id: companyId } },
  //           });

  //           if (existingJob) {
  //             const { id, ...updateData } = jobDto;
  //             Object.assign(existingJob, updateData);
  //             const saved = await this.jobRepository.save(existingJob);
  //             updatedJobs.push(saved);
  //           }
  //         } else {
  //           const newJob = this.jobRepository.create({
  //             ...jobDto,
  //             company,
  //           });
  //           const saved = await this.jobRepository.save(newJob);
  //           updatedJobs.push(saved);
  //         }
  //       }

  //       company.openPositions = await this.jobRepository.find({
  //         where: { company: { id: companyId } },
  //       });
  //     }

  //     if (updateCompanyInfoDTO.careerScopes) {
  //       const updateCareerScopes = [];

  //       for (const careerScopeDto of updateCompanyInfoDTO.careerScopes) {
  //         if (careerScopeDto.id) {
  //           const existingCareerScope =
  //             await this.careerScopeRepository.findOne({
  //               where: { id: careerScopeDto.id, companies: { id: companyId } },
  //             });

  //           if (existingCareerScope) {
  //             const { id, ...updateData } = careerScopeDto;
  //             Object.assign(existingCareerScope, updateData);
  //             const saved =
  //               await this.careerScopeRepository.save(existingCareerScope);
  //             updateCareerScopes.push(saved);
  //           }
  //         }

  //         if (careerScopeDto.id === undefined) {
  //           const newCareerScope = this.careerScopeRepository.create({
  //             ...careerScopeDto,
  //             companies: [company],
  //           });
  //           const saved = await this.careerScopeRepository.save(newCareerScope);
  //           updateCareerScopes.push(saved);
  //         }
  //       }

  //       if (updateCompanyInfoDTO.careerScopeIdsToDelete?.length > 0) {
  //         // First, remove the relationship from the company
  //         const companyWithCareerScopes = await this.companyRepository.findOne({
  //           where: { id: companyId },
  //           relations: ['careerScopes'],
  //         });

  //         // Filter out the careerScopes to be delete
  //         companyWithCareerScopes.careerScopes =
  //           companyWithCareerScopes.careerScopes.filter(
  //             (cs) =>
  //               !updateCompanyInfoDTO.careerScopeIdsToDelete.includes(cs.id),
  //           );

  //         // Save the company (this removes the relationship in junction table)
  //         await this.companyRepository.save(companyWithCareerScopes);
  //       }
  //     }

  //     if (updateCompanyInfoDTO.socials) {
  //       const updateSocials = [];

  //       for (const socialDto of updateCompanyInfoDTO.socials) {
  //         if (socialDto.id) {
  //           const existingSocial = await this.socialRepository.findOne({
  //             where: { id: socialDto.id, company: { id: companyId } },
  //           });

  //           if (existingSocial) {
  //             const { id, ...updateData } = socialDto;
  //             Object.assign(existingSocial, updateData);
  //             const saved = await this.socialRepository.save(existingSocial);
  //             updateSocials.push(saved);
  //           }
  //         }

  //         if (socialDto.id === undefined) {
  //           const newSocial = this.socialRepository.create({
  //             ...socialDto,
  //             company: company,
  //           });
  //           const saved = await this.socialRepository.save(newSocial);
  //           updateSocials.push(saved);
  //         }
  //       }

  //       if (updateCompanyInfoDTO.socialIdsToDelete?.length > 0) {
  //         // First, remove the relationship from the company
  //         const companyWithSocials = await this.companyRepository.findOne({
  //           where: { id: companyId },
  //           relations: ['socials'],
  //         });

  //         // Filter out the social to be delete
  //         companyWithSocials.socials = companyWithSocials.socials.filter(
  //           (social) =>
  //             !updateCompanyInfoDTO.socialIdsToDelete.includes(social.id),
  //         );

  //         // Saved the company (this remove the relationship in junction table)
  //         await this.companyRepository.save(companyWithSocials);
  //       }
  //     }

  //     // Save updated company entity
  //     await this.companyRepository.save(company);

  //     // ✅ Find owner userId of this company
  //     const owner = await this.userRepository.findOne({
  //       where: { company: { id: companyId } },
  //       select: ['id'],
  //     });

  //     if (owner?.id) {
  //       // ✅ Delete cache used by findOneUserByID()
  //       await this.redisService.del(
  //         this.redisService.generateUserKey('detail', owner.id),
  //       );
  //     }

  //     return {
  //       message: 'Company information updated successfully',
  //       company: new CompanyResponseDTO({
  //         ...company,
  //         openPositions: company.openPositions?.map(
  //           (job) => new JobPositionDTO(job),
  //         ),
  //       }),
  //     };
  //   } catch (error) {
  //     // Handle error
  //     this.logger.error(
  //       (error as Error).message ||
  //         "An error occurred while updating the company's information.",
  //     );
  //     throw new RpcException({
  //       message:
  //         (error as Error).message ||
  //         "An error occurred while updating the company's information.",
  //       statusCode: 500,
  //     });
  //   }
  // }

  async updateCompanyInfo(
    updateCompanyInfoDTO: UpdateCompanyInfoDTO,
    companyId: string,
  ): Promise<{ message: string; company: CompanyResponseDTO }> {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: [
          'benefits',
          'values',
          'openPositions',
          'careerScopes',
          'socials',
        ],
      });

      if (!company) {
        throw new RpcException({
          message: 'There is no company with this ID.',
          statusCode: 404,
        });
      }

      // ✅ Never assign relation arrays directly (prevents wiping join tables)
      const {
        benefits,
        values,
        jobs,
        careerScopes,
        socials,
        benefitIdsToDelete,
        valueIdsToDelete,
        careerScopeIdsToDelete,
        socialIdsToDelete,
        ...scalarFields
      } = updateCompanyInfoDTO as any;

      // ✅ scalar fields only
      Object.assign(company, scalarFields);

      /* ------------------------ BENEFITS (M2M) ------------------------ */
      if (Array.isArray(benefits)) {
        for (const benefitDto of benefits) {
          const id = (benefitDto as any)?.id;

          if (id) {
            const existing = await this.benefitRepository.findOne({
              where: { id },
            });
            if (existing) {
              const { id: _, ...updateData } = benefitDto as any;
              Object.assign(existing, updateData);
              await this.benefitRepository.save(existing);

              // ensure linked
              await this.companyRepository
                .createQueryBuilder()
                .relation(Company, 'benefits')
                .of(companyId)
                .add(existing.id)
                .catch(() => undefined);
            }
          } else {
            const created = await this.benefitRepository.save(
              this.benefitRepository.create({
                ...(benefitDto as any),
                companies: [company],
              }),
            );
            // already linked via companies: [company]
          }
        }

        if (
          Array.isArray(benefitIdsToDelete) &&
          benefitIdsToDelete.length > 0
        ) {
          await this.companyRepository
            .createQueryBuilder()
            .relation(Company, 'benefits')
            .of(companyId)
            .remove(benefitIdsToDelete);
        }
      }

      /* ------------------------ VALUES (M2M) ------------------------ */
      if (Array.isArray(values)) {
        for (const valueDto of values) {
          const id = (valueDto as any)?.id;

          if (id) {
            const existing = await this.valueRepository.findOne({
              where: { id },
            });
            if (existing) {
              const { id: _, ...updateData } = valueDto as any;
              Object.assign(existing, updateData);
              await this.valueRepository.save(existing);

              await this.companyRepository
                .createQueryBuilder()
                .relation(Company, 'values')
                .of(companyId)
                .add(existing.id)
                .catch(() => undefined);
            }
          } else {
            await this.valueRepository.save(
              this.valueRepository.create({
                ...(valueDto as any),
                companies: [company],
              }),
            );
          }
        }

        if (Array.isArray(valueIdsToDelete) && valueIdsToDelete.length > 0) {
          await this.companyRepository
            .createQueryBuilder()
            .relation(Company, 'values')
            .of(companyId)
            .remove(valueIdsToDelete);
        }
      }

      /* ------------------------ JOBS (O2M) ------------------------ */
      if (Array.isArray(jobs)) {
        for (const jobDto of jobs) {
          const jobId = (jobDto as any)?.id;

          if (jobId) {
            const existing = await this.jobRepository.findOne({
              where: { id: jobId, company: { id: companyId } },
            });

            if (existing) {
              const { id: _, ...updateData } = jobDto as any;
              Object.assign(existing, updateData);
              await this.jobRepository.save(existing);
            }
          } else {
            await this.jobRepository.save(
              this.jobRepository.create({
                ...(jobDto as any),
                company,
              }),
            );
          }
        }
      }

      /* ------------------------ CAREER SCOPES (MANY-TO-MANY FIX) ------------------------ */
      if (Array.isArray(careerScopes)) {
        // 1) Normalize incoming DTO
        const incoming = careerScopes
          .filter(Boolean)
          .map((cs: any) => ({
            id: (cs.id ?? '').toString().trim(), // may be "" if frontend lost it
            name: (cs.name ?? '').toString().trim(),
            description: (cs.description ?? '').toString().trim(),
          }))
          .filter((cs) => cs.id || cs.name); // must have at least id or name

        // 2) Resolve DTO items -> real CareerScope IDs (prevent duplicates by name)
        const finalIds: string[] = [];

        for (const csDto of incoming) {
          // If ID exists, use it (and optionally update fields)
          if (csDto.id) {
            const byId = await this.careerScopeRepository.findOne({
              where: { id: csDto.id },
            });
            if (!byId) continue;

            // optional update
            const patch: any = {};
            if (csDto.name) patch.name = csDto.name;
            if (csDto.description) patch.description = csDto.description;
            if (Object.keys(patch).length) {
              Object.assign(byId, patch);
              await this.careerScopeRepository.save(byId);
            }

            finalIds.push(byId.id);
            continue;
          }

          // No ID -> try find by name
          const byName = await this.careerScopeRepository.findOne({
            where: { name: csDto.name },
          });

          if (byName) {
            // optional update description
            if (csDto.description && csDto.description !== byName.description) {
              byName.description = csDto.description;
              await this.careerScopeRepository.save(byName);
            }
            finalIds.push(byName.id);
            continue;
          }

          // Create new
          const created = await this.careerScopeRepository.save(
            this.careerScopeRepository.create({
              name: csDto.name,
              description: csDto.description || null,
            }),
          );

          finalIds.push(created.id);
        }

        // unique
        const uniqueFinalIds = Array.from(new Set(finalIds));

        // 3) Load current relation IDs
        const companyWithScopes = await this.companyRepository.findOne({
          where: { id: companyId },
          relations: ['careerScopes'],
          select: { id: true }, // keep light
        });

        const currentIds = new Set(
          (companyWithScopes?.careerScopes ?? []).map((cs) => cs.id),
        );
        const finalSet = new Set(uniqueFinalIds);

        const toAdd = uniqueFinalIds.filter((id) => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter(
          (id) => !finalSet.has(id),
        );

        // 4) Apply changes atomically for M:N
        if (toAdd.length || toRemove.length) {
          await this.companyRepository
            .createQueryBuilder()
            .relation(Company, 'careerScopes')
            .of(companyId)
            .addAndRemove(toAdd, toRemove);
        }

        // 5) Refresh the relation for response
        company.careerScopes = await this.careerScopeRepository
          .createQueryBuilder('cs')
          .innerJoin('cs.companies', 'c', 'c.id = :companyId', { companyId })
          .getMany();
      }

      /* ------------------------ SOCIALS (O2M) ------------------------ */
      if (Array.isArray(socials)) {
        for (const socialDto of socials) {
          const socialId = (socialDto as any)?.id;

          if (socialId) {
            const existing = await this.socialRepository.findOne({
              where: { id: socialId, company: { id: companyId } },
            });

            if (existing) {
              const { id: _, ...updateData } = socialDto as any;
              Object.assign(existing, updateData);
              await this.socialRepository.save(existing);
            }
          } else {
            await this.socialRepository.save(
              this.socialRepository.create({
                ...(socialDto as any),
                company,
              }),
            );
          }
        }

        if (Array.isArray(socialIdsToDelete) && socialIdsToDelete.length > 0) {
          await this.socialRepository.delete(socialIdsToDelete);
        }
      }

      // ✅ save only scalar updates safely
      await this.companyRepository.save(company);

      // ✅ reload fully fresh company snapshot for response
      const freshCompany = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: [
          'benefits',
          'values',
          'openPositions',
          'careerScopes',
          'socials',
          'images',
        ],
      });

      // ✅ clear caches for ALL users in this company
      const users = await this.userRepository.find({
        where: { company: { id: companyId } },
        select: ['id'],
      });

      const keysToDelete = users.map((u) =>
        this.redisService.generateUserKey('detail', u.id),
      );
      keysToDelete.push(this.redisService.generateListKey('user', {}));

      await Promise.all(keysToDelete.map((k) => this.redisService.del(k)));

      return {
        message: 'Company information updated successfully',
        company: new CompanyResponseDTO({
          ...(freshCompany ?? company),
          openPositions: (
            freshCompany?.openPositions ?? company.openPositions
          )?.map((job) => new JobPositionDTO(job)),
        }),
      };
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          "An error occurred while updating the company's information.",
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while updating the company's information.",
        statusCode: 500,
      });
    }
  }
}
