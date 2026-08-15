import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EmbeddingService } from '@app/common/embedding/embedding.service';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import { resolveOrCreateByKey } from '@app/common/utils/resolve-or-create-by-key.util';
import { parseSkillList } from '@app/common/utils/skill.util';
import { upsertOwnedRows } from '@app/common/utils/upsert-owned-rows.util';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { DeepPartial, In, Repository } from 'typeorm';
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
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(Social)
    private readonly socialRepository: Repository<Social>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Resolves skill names onto the shared `skill` table, creating any that do
   * not exist, and returns them keyed by name for linking to jobs. One SELECT
   * plus at most one INSERT for the whole batch, however many positions were
   * submitted.
   */
  private async resolveSkills(names: string[]): Promise<Map<string, Skill>> {
    const wanted = new Map(
      [...new Set(names)].map((name) => [name, {} as DeepPartial<Skill>]),
    );
    if (!wanted.size) return new Map();

    const { resolved } = await resolveOrCreateByKey(
      this.skillRepository,
      'name',
      wanted,
    );
    return new Map(resolved.map((skill) => [skill.name, skill]));
  }

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
        const wanted = new Map<string, DeepPartial<Benefit>>();

        for (const b of benefits) {
          const id = b?.id;
          const label = (b?.label ?? '').trim();

          if (id) {
            finalIds.push(id);
            continue;
          }

          // prevent duplicates by label
          if (!label || wanted.has(label)) continue;
          wanted.set(label, {});
        }

        const { resolved } = await resolveOrCreateByKey(
          this.benefitRepository,
          'label',
          wanted,
        );
        finalIds.push(...resolved.map((row) => row.id));

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
        const wanted = new Map<string, DeepPartial<Value>>();

        for (const v of values) {
          const id = v?.id;
          const label = (v?.label ?? '').trim();

          if (id) {
            finalIds.push(id);
            continue;
          }

          if (!label || wanted.has(label)) continue;
          wanted.set(label, {});
        }

        const { resolved } = await resolveOrCreateByKey(
          this.valueRepository,
          'label',
          wanted,
        );
        finalIds.push(...resolved.map((row) => row.id));

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
        // Ownership is resolved for the whole batch in one query rather than
        // one per job. This loop does not use upsertOwnedRows because re-embed
        // needs the title as it was BEFORE the patch, which is only observable
        // here.
        const submittedIds = jobs
          .map((jobDto) => jobDto?.id)
          .filter((id): id is string => Boolean(id));

        const ownedById = new Map<string, Job>();
        if (submittedIds.length > 0) {
          const owned = await this.jobRepository.find({
            where: { id: In(submittedIds), company: { id: companyId } },
            // Loaded so TypeORM can diff the join table on save; without it a
            // skill removed from a position would linger.
            relations: ['requiredSkills'],
          });
          for (const row of owned) ownedById.set(row.id, row);
        }

        // Titles needing an embedding, collected during the pass and flushed
        // after the save so a failed write never triggers a stale embedding.
        const toEmbed: { id: string; title: string }[] = [];
        const pending: Job[] = [];
        const createdJobs: Job[] = [];

        // Resolve every submitted skill name onto the shared `skill` table in
        // one pass, so each job can be linked without a round trip per row.
        // The legacy `skillsRequired` string is still assigned alongside it
        // until a later release drops the column.
        const skillByName = await this.resolveSkills(
          jobs.flatMap((jobDto) => parseSkillList(jobDto?.skillsRequired)),
        );
        const relationFor = (skillsRequired?: string) =>
          parseSkillList(skillsRequired)
            .map((name) => skillByName.get(name))
            .filter((skill): skill is Skill => Boolean(skill));

        for (const jobDto of jobs) {
          const jobId = jobDto?.id;

          if (jobId) {
            const existing = ownedById.get(jobId);
            if (!existing) continue;

            const previousTitle = existing.title;
            const updateData = { ...jobDto };
            delete updateData.id;
            Object.assign(existing, updateData);
            // Only replace the relation when this patch actually carried
            // skills; an unrelated field edit must not clear them.
            if (updateData.skillsRequired !== undefined) {
              existing.requiredSkills = relationFor(updateData.skillsRequired);
            }
            pending.push(existing);

            // Re-embed when title changes.
            if (updateData.title && updateData.title !== previousTitle) {
              toEmbed.push({ id: jobId, title: updateData.title as string });
            }
          } else {
            const entity = this.jobRepository.create({
              ...jobDto,
              company,
              requiredSkills: relationFor(jobDto?.skillsRequired),
            }) as unknown as Job;
            createdJobs.push(entity);
            pending.push(entity);
          }
        }

        if (pending.length > 0) {
          // save() writes generated ids back onto the entities it was given, so
          // createdJobs holds the new ids afterwards — the saved array cannot be
          // indexed against `jobs`, whose skipped rows never entered `pending`.
          await this.jobRepository.save(pending);

          for (const row of createdJobs) {
            if (row.title) toEmbed.push({ id: row.id, title: row.title });
          }
        }

        // Fire-and-forget: embed titles for semantic recommendation matching.
        for (const { id, title } of toEmbed) {
          this.embeddingService
            .embedAsVector(title)
            .then((vector) =>
              this.jobRepository.query(
                `UPDATE job SET "titleEmbedding" = $1::vector WHERE id = $2`,
                [vector, id],
              ),
            )
            .catch((err: Error) =>
              this.logger.warn(
                `Failed to embed job title "${title}": ${err.message}`,
              ),
            );
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
        const wanted = new Map<string, DeepPartial<CareerScope>>();

        for (const cs of careerScopes) {
          if (cs.id) {
            finalIds.push(cs.id);
            continue;
          }
          const name = (cs.name ?? '').trim();
          if (!name || wanted.has(name)) continue;
          wanted.set(name, { description: cs.description ?? null });
        }

        const { resolved, created } = await resolveOrCreateByKey(
          this.careerScopeRepository,
          'name',
          wanted,
        );
        finalIds.push(...resolved.map((row) => row.id));

        // Generate and persist the semantic embedding asynchronously, for the
        // newly created scopes only. Fire-and-forget: don't block the response.
        for (const row of created) {
          this.embeddingService
            .embedAsVector(row.name)
            .then((vector) =>
              this.careerScopeRepository.query(
                `UPDATE career_scope SET embedding = $1::vector WHERE id = $2`,
                [vector, row.id],
              ),
            )
            .catch((err: Error) =>
              this.logger.warn(
                `Failed to embed career scope "${row.name}": ${err.message}`,
              ),
            );
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
        await upsertOwnedRows(this.socialRepository, socials, {
          ownerWhere: { company: { id: companyId } },
          ownerValue: { company },
        });
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
