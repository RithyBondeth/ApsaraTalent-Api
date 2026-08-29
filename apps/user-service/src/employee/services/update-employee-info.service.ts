import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EmbeddingService } from '@app/common/embedding/embedding.service';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import {
  normalizeScopeName,
  resolveCareerScopes,
} from '@app/common/utils/resolve-career-scopes.util';
import { resolveOrCreateByKey } from '@app/common/utils/resolve-or-create-by-key.util';
import { upsertOwnedRows } from '@app/common/utils/upsert-owned-rows.util';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { DeepPartial, Repository } from 'typeorm';
import {
  UpdateEmployeeInfoRpcDTO,
  UpdateEmployeeInfoResponseDTO,
  EmployeeResponseDTO,
} from '@app/contracts/dtos/user';
import { IUpdateEmployeeInfoService } from '@app/contracts/interfaces/service/user-service.interface';

@Injectable()
export class UpdateEmployeeInfoService implements IUpdateEmployeeInfoService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Experience)
    private readonly experienceRepository: Repository<Experience>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(Social)
    private readonly socialRepository: Repository<Social>,
    @InjectRepository(Education)
    private readonly educationRepository: Repository<Education>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async updateEmployeeInfo(
    updateEmployeeInfoRpcDTO: UpdateEmployeeInfoRpcDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO> {
    const { employeeId, updateEmployeeInfoDTO } = updateEmployeeInfoRpcDTO;
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: [
          'user',
          'skills',
          'experiences',
          'careerScopes',
          'socials',
          'educations',
        ],
      });

      if (!employee) {
        throw new RpcException({
          message: 'There is no employee with this ID.',
          statusCode: 404,
        });
      }

      const {
        skills,
        careerScopes,
        experiences,
        educations,
        socials,
        skillIdsToDelete,
        careerScopeIdsToDelete,
        experienceIdsToDelete,
        educationIdsToDelete,
        socialIdsToDelete,
        email,
        ...scalarFields
      } = updateEmployeeInfoDTO as any;

      /* =======================================================
         1️⃣ UPDATE SCALAR FIELDS
      ======================================================= */
      const previousJob = employee.job;
      Object.assign(employee, scalarFields);
      await this.employeeRepository.save(employee);

      if (email !== undefined && employee.user) {
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail && normalizedEmail !== employee.user.email) {
          employee.user.email = normalizedEmail;
          employee.user.isEmailVerified = false;
          await this.userRepository.save(employee.user);
        }
      }

      // When the job/position title changes, re-embed it asynchronously.
      // Fire-and-forget: don't block the profile update response.
      if (
        scalarFields.job !== undefined &&
        scalarFields.job !== previousJob &&
        scalarFields.job
      ) {
        this.embeddingService
          .embedAsVector(scalarFields.job as string)
          .then((vector) =>
            this.employeeRepository.query(
              `UPDATE employee SET "jobEmbedding" = $1::vector WHERE id = $2`,
              [vector, employeeId],
            ),
          )
          .catch((err: Error) =>
            this.logger.warn(
              `Failed to embed employee job title "${scalarFields.job as string}": ${err.message}`,
            ),
          );
      }

      /* =======================================================
         2️⃣ SKILLS (M2M SAFE) by name
      ======================================================= */
      if (Array.isArray(skills)) {
        const wanted = new Map<string, DeepPartial<Skill>>();
        const finalIds: string[] = [];

        for (const s of skills) {
          if (s?.id) {
            finalIds.push(s.id);
            continue;
          }
          const name = (s?.name ?? '').trim();
          if (!name || wanted.has(name)) continue;
          wanted.set(name, { description: s?.description ?? null });
        }

        const { resolved } = await resolveOrCreateByKey(
          this.skillRepository,
          'name',
          wanted,
        );
        finalIds.push(...resolved.map((row) => row.id));

        const uniqueFinalIds = Array.from(new Set(finalIds));
        const currentIds = new Set((employee.skills ?? []).map((x) => x.id));
        const finalSet = new Set(uniqueFinalIds);

        const toAdd = uniqueFinalIds.filter((id) => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter(
          (id) =>
            !finalSet.has(id) ||
            (Array.isArray(skillIdsToDelete) && skillIdsToDelete.includes(id)),
        );

        if (toAdd.length || toRemove.length) {
          await this.employeeRepository
            .createQueryBuilder()
            .relation(Employee, 'skills')
            .of(employeeId)
            .addAndRemove(toAdd, toRemove);
        }
      }

      /* =======================================================
         3️⃣ CAREER SCOPES (M2M SAFE) by name
      ======================================================= */
      if (Array.isArray(careerScopes)) {
        const wanted = new Map<string, DeepPartial<CareerScope>>();
        const finalIds: string[] = [];

        for (const cs of careerScopes) {
          if (cs?.id) {
            finalIds.push(cs.id);
            continue;
          }
          const name = normalizeScopeName(cs?.name ?? '');
          if (!name || wanted.has(name)) continue;
          wanted.set(name, { description: cs?.description ?? null });
        }

        // Reuses an existing scope when the submitted name is the same concept
        // under another spelling, so free-text input cannot keep growing the
        // global career_scope table. Embeds and persists the vector inline.
        const resolved = await resolveCareerScopes({
          repository: this.careerScopeRepository,
          embeddingService: this.embeddingService,
          logger: this.logger,
          wanted,
        });
        finalIds.push(...resolved.map((row) => row.id));

        const uniqueFinalIds = Array.from(new Set(finalIds));
        const currentIds = new Set(
          (employee.careerScopes ?? []).map((x) => x.id),
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
          await this.employeeRepository
            .createQueryBuilder()
            .relation(Employee, 'careerScopes')
            .of(employeeId)
            .addAndRemove(toAdd, toRemove);
        }
      }

      /* =======================================================
         4️⃣ EXPERIENCES (O2M) upsert + scoped delete
      ======================================================= */
      if (Array.isArray(experiences)) {
        await upsertOwnedRows(this.experienceRepository, experiences, {
          ownerWhere: { employee: { id: employeeId } },
          ownerValue: { employee },
        });
      }

      if (
        Array.isArray(experienceIdsToDelete) &&
        experienceIdsToDelete.length > 0
      ) {
        await this.experienceRepository
          .createQueryBuilder()
          .delete()
          .from(Experience)
          .where('id IN (:...ids)', { ids: experienceIdsToDelete })
          .andWhere('employeeId = :employeeId', { employeeId })
          .execute();
      }

      /* =======================================================
         5️⃣ EDUCATIONS (O2M) upsert + scoped delete
      ======================================================= */
      if (Array.isArray(educations)) {
        await upsertOwnedRows(this.educationRepository, educations, {
          ownerWhere: { employee: { id: employeeId } },
          ownerValue: { employee },
        });
      }

      if (
        Array.isArray(educationIdsToDelete) &&
        educationIdsToDelete.length > 0
      ) {
        await this.educationRepository
          .createQueryBuilder()
          .delete()
          .from(Education)
          .where('id IN (:...ids)', { ids: educationIdsToDelete })
          .andWhere('employeeId = :employeeId', { employeeId })
          .execute();
      }

      /* =======================================================
         6️⃣ SOCIALS (O2M) upsert + scoped delete
      ======================================================= */
      if (Array.isArray(socials)) {
        await upsertOwnedRows(this.socialRepository, socials, {
          ownerWhere: { employee: { id: employeeId } },
          ownerValue: { employee },
        });

        if (Array.isArray(socialIdsToDelete) && socialIdsToDelete.length > 0) {
          await this.socialRepository
            .createQueryBuilder()
            .delete()
            .from(Social)
            .where('id IN (:...ids)', { ids: socialIdsToDelete })
            .andWhere('employeeId = :employeeId', { employeeId })
            .execute();
        }
      }

      /* =======================================================
         7️⃣ RELOAD EMPLOYEE SNAPSHOT
      ======================================================= */
      const freshEmployee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: [
          'user',
          'skills',
          'experiences',
          'careerScopes',
          'socials',
          'educations',
        ],
      });

      /* =======================================================
         8️⃣ CACHE INVALIDATION (same style as company)
         - user detail cache for this employee's user
         - user list cache
      ======================================================= */
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

      return new UpdateEmployeeInfoResponseDTO({
        message: 'Employee information updated successfully',
        employee: new EmployeeResponseDTO({
          ...(freshEmployee ?? employee),
          email: freshEmployee?.user?.email ?? employee.user?.email,
        }),
      });
    } catch (error) {
      // preserve intended RpcException status codes (404, etc.)
      if (error instanceof RpcException) throw error;

      this.logger.error(
        (error as Error)?.message ||
          "An error occurred while updating the employee's information.",
      );

      throw new RpcException({
        message:
          (error as Error)?.message ||
          "An error occurred while updating the employee's information.",
        statusCode: 500,
      });
    }
  }
}
