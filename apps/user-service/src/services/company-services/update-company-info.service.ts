import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EmbeddingService } from '@app/common/embedding/embedding.service';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  UpdateCompanyInfoRpcDTO,
  CompanyResponseDTO,
  UpdateCompanyInfoResponseDTO,
  JobPositionResponseDTO,
} from '@app/contracts/dtos/user';
import { IUpdateCompanyInfoService } from '@app/contracts/interfaces/service/user-service.interface';

@Injectable()
export class UpdateCompanyInfoService implements IUpdateCompanyInfoService {
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
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async updateCompanyInfo(
    updateCompanyInfoRpcDTO: UpdateCompanyInfoRpcDTO,
  ): Promise<UpdateCompanyInfoResponseDTO> {
    const { companyId, updateCompanyInfoDTO } = updateCompanyInfoRpcDTO;
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: [
          'user',
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
        jobIdsToDelete,
        email,
        ...scalarFields
      } = updateCompanyInfoDTO as any;

      /* =======================================================
         1️⃣ UPDATE SCALAR FIELDS
      ======================================================= */
      Object.assign(company, scalarFields);
      await this.companyRepository.save(company);

      if (email !== undefined && company.user) {
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail && normalizedEmail !== company.user.email) {
          company.user.email = normalizedEmail;
          company.user.isEmailVerified = false;
          await this.userRepository.save(company.user);
        }
      }

      /* =======================================================
         2️⃣ BENEFITS (MANY-TO-MANY SAFE)
      ======================================================= */
      if (Array.isArray(benefits)) {
        const finalIds: number[] = [];

        for (const b of benefits) {
          const id = b?.id;
          const label = (b?.label ?? '').trim();

          if (id) {
            finalIds.push(id);
            continue;
          }

          if (!label) continue;

          // prevent duplicates by label
          const existing = await this.benefitRepository.findOne({
            where: { label },
          });

          if (existing) {
            finalIds.push(existing.id);
          } else {
            const created = await this.benefitRepository.save(
              this.benefitRepository.create({ label }),
            );
            finalIds.push(created.id);
          }
        }

        const uniqueFinalIds = Array.from(new Set(finalIds));

        const currentIds = new Set((company.benefits ?? []).map((b) => b.id));
        const finalSet = new Set(uniqueFinalIds);

        const toAdd = uniqueFinalIds.filter((id) => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter(
          (id) =>
            !finalSet.has(id) ||
            (Array.isArray(benefitIdsToDelete) &&
              benefitIdsToDelete.includes(id)),
        );

        if (toAdd.length || toRemove.length) {
          await this.companyRepository
            .createQueryBuilder()
            .relation(Company, 'benefits')
            .of(companyId)
            .addAndRemove(toAdd, toRemove);
        }
      }

      /* =======================================================
         3️⃣ VALUES (MANY-TO-MANY SAFE)
      ======================================================= */
      if (Array.isArray(values)) {
        const finalIds: number[] = [];

        for (const v of values) {
          const id = v?.id;
          const label = (v?.label ?? '').trim();

          if (id) {
            finalIds.push(id);
            continue;
          }

          if (!label) continue;

          const existing = await this.valueRepository.findOne({
            where: { label },
          });

          if (existing) {
            finalIds.push(existing.id);
          } else {
            const created = await this.valueRepository.save(
              this.valueRepository.create({ label }),
            );
            finalIds.push(created.id);
          }
        }

        const uniqueFinalIds = Array.from(new Set(finalIds));

        const currentIds = new Set((company.values ?? []).map((v) => v.id));
        const finalSet = new Set(uniqueFinalIds);

        const toAdd = uniqueFinalIds.filter((id) => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter(
          (id) =>
            !finalSet.has(id) ||
            (Array.isArray(valueIdsToDelete) && valueIdsToDelete.includes(id)),
        );

        if (toAdd.length || toRemove.length) {
          await this.companyRepository
            .createQueryBuilder()
            .relation(Company, 'values')
            .of(companyId)
            .addAndRemove(toAdd, toRemove);
        }
      }

      /* =======================================================
         4️⃣ JOBS (ONE-TO-MANY)
      ======================================================= */
      if (Array.isArray(jobs)) {
        for (const jobDto of jobs) {
          const jobId = jobDto?.id;

          if (jobId) {
            const existing = await this.jobRepository.findOne({
              where: { id: jobId, company: { id: companyId } },
            });

            if (existing) {
              const previousTitle = existing.title;
              const updateData = { ...jobDto };
              delete updateData.id;
              Object.assign(existing, updateData);
              await this.jobRepository.save(existing);

              // Re-embed when title changes.
              if (updateData.title && updateData.title !== previousTitle) {
                this.embeddingService
                  .embedAsVector(updateData.title as string)
                  .then((vector) =>
                    this.jobRepository.query(
                      `UPDATE job SET "titleEmbedding" = $1::vector WHERE id = $2`,
                      [vector, jobId],
                    ),
                  )
                  .catch((err: Error) =>
                    this.logger.warn(
                      `Failed to embed job title "${updateData.title as string}": ${err.message}`,
                    ),
                  );
              }
            }
          } else {
            const created = (await this.jobRepository.save(
              this.jobRepository.create({
                ...jobDto,
                company,
              }),
            )) as unknown as Job;

            // Fire-and-forget: embed the new job title for semantic recommendation matching.
            if (created.title) {
              this.embeddingService
                .embedAsVector(created.title)
                .then((vector) =>
                  this.jobRepository.query(
                    `UPDATE job SET "titleEmbedding" = $1::vector WHERE id = $2`,
                    [vector, created.id],
                  ),
                )
                .catch((err: Error) =>
                  this.logger.warn(
                    `Failed to embed job title "${created.title}": ${err.message}`,
                  ),
                );
            }
          }
        }
      }

      if (Array.isArray(jobIdsToDelete) && jobIdsToDelete.length > 0) {
        await this.jobRepository
          .createQueryBuilder()
          .delete()
          .from(Job)
          .where('id IN (:...ids)', { ids: jobIdsToDelete })
          .andWhere('companyId = :companyId', { companyId })
          .execute();
      }

      /* =======================================================
         5️⃣ CAREER SCOPES (KEEP YOUR WORKING LOGIC)
      ======================================================= */
      if (Array.isArray(careerScopes)) {
        const finalIds: string[] = [];

        for (const cs of careerScopes) {
          if (cs.id) {
            finalIds.push(cs.id);
            continue;
          }

          const existing = await this.careerScopeRepository.findOne({
            where: { name: cs.name },
          });

          if (existing) {
            finalIds.push(existing.id);
          } else {
            const created = await this.careerScopeRepository.save(
              this.careerScopeRepository.create({
                name: cs.name,
                description: cs.description ?? null,
              }),
            );
            finalIds.push(created.id);

            // Generate and persist the semantic embedding asynchronously.
            // Fire-and-forget: don't block the profile update response.
            this.embeddingService
              .embedAsVector(cs.name)
              .then((vector) =>
                this.careerScopeRepository.query(
                  `UPDATE career_scope SET embedding = $1::vector WHERE id = $2`,
                  [vector, created.id],
                ),
              )
              .catch((err: Error) =>
                this.logger.warn(
                  `Failed to embed career scope "${cs.name}": ${err.message}`,
                ),
              );
          }
        }

        const uniqueFinalIds = Array.from(new Set(finalIds));
        const currentIds = new Set(
          (company.careerScopes ?? []).map((c) => c.id),
        );
        const finalSet = new Set(uniqueFinalIds);

        const toAdd = uniqueFinalIds.filter((id) => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter(
          (id) =>
            !finalSet.has(id) ||
            (Array.isArray(careerScopeIdsToDelete) &&
              careerScopeIdsToDelete.includes(id)),
        );

        if (toAdd.length || toRemove.length) {
          await this.companyRepository
            .createQueryBuilder()
            .relation(Company, 'careerScopes')
            .of(companyId)
            .addAndRemove(toAdd, toRemove);
        }
      }

      /* =======================================================
         6️⃣ SOCIALS (O2M)
      ======================================================= */
      if (Array.isArray(socials)) {
        for (const socialDto of socials) {
          if (socialDto.id) {
            const existing = await this.socialRepository.findOne({
              where: { id: socialDto.id, company: { id: companyId } },
            });

            if (existing) {
              const updateData = { ...socialDto };
              delete updateData.id;
              Object.assign(existing, updateData);
              await this.socialRepository.save(existing);
            }
          } else {
            await this.socialRepository.save(
              this.socialRepository.create({
                ...socialDto,
                company,
              }),
            );
          }
        }
      }

      if (Array.isArray(socialIdsToDelete) && socialIdsToDelete.length > 0) {
        await this.socialRepository
          .createQueryBuilder()
          .delete()
          .from(Social)
          .where('id IN (:...ids)', { ids: socialIdsToDelete })
          .andWhere('companyId = :companyId', { companyId })
          .execute();
      }

      /* =======================================================
         7️⃣ RELOAD COMPANY SNAPSHOT
      ======================================================= */
      const freshCompany = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: [
          'user',
          'benefits',
          'values',
          'openPositions',
          'careerScopes',
          'socials',
          'images',
        ],
      });

      /* =======================================================
         8️⃣ CACHE INVALIDATION
      ======================================================= */
      await this.cacheInvalidationService.invalidateCompanyCache(companyId);

      return new UpdateCompanyInfoResponseDTO({
        message: 'Company information updated successfully',
        company: new CompanyResponseDTO({
          ...(freshCompany ?? company),
          email: freshCompany?.user?.email ?? company.user?.email,
          openPositions: (
            freshCompany?.openPositions ?? company.openPositions
          )?.map((job) => new JobPositionResponseDTO(job)),
        }),
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;

      this.logger.error(
        (error as Error)?.message ||
          "An error occurred while updating the company's information.",
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          "An error occurred while updating the company's information.",
        statusCode: 500,
      });
    }
  }
}
