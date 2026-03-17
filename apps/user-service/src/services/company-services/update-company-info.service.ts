import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { UpdateCompanyInfoDTO } from '../../dtos/company/update-company-info.dto';
import {
    CompanyResponseDTO,
    JobPositionDTO
} from '../../dtos/user-response.dto';

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

      const {
        benefits,
        values,
        jobs,
        careerScopes,
        socials,
        benefitIdsToDelete,
        valueIdsToDelete,
        socialIdsToDelete,
        ...scalarFields
      } = updateCompanyInfoDTO as any;

      /* =======================================================
         1️⃣ UPDATE SCALAR FIELDS
      ======================================================= */
      Object.assign(company, scalarFields);
      await this.companyRepository.save(company);

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

        const currentIds = new Set(company.benefits.map((b) => b.id));
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

        const currentIds = new Set(company.values.map((v) => v.id));
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
              const { id: _, ...updateData } = jobDto;
              Object.assign(existing, updateData);
              await this.jobRepository.save(existing);
            }
          } else {
            await this.jobRepository.save(
              this.jobRepository.create({
                ...jobDto,
                company,
              }),
            );
          }
        }
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
          }
        }

        const uniqueFinalIds = Array.from(new Set(finalIds));
        const currentIds = new Set(company.careerScopes.map((c) => c.id));
        const finalSet = new Set(uniqueFinalIds);

        const toAdd = uniqueFinalIds.filter((id) => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter(
          (id) => !finalSet.has(id),
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
              const { id: _, ...updateData } = socialDto;
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

        if (Array.isArray(socialIdsToDelete) && socialIdsToDelete.length > 0) {
          await this.socialRepository.delete(socialIdsToDelete);
        }
      }

      /* =======================================================
         7️⃣ RELOAD COMPANY SNAPSHOT
      ======================================================= */
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

      /* =======================================================
         8️⃣ CACHE INVALIDATION
      ======================================================= */
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
