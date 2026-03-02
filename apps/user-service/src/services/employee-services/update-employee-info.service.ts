// import { Injectable } from '@nestjs/common';
// import { UpdateEmployeeInfoDTO } from '../../dtos/employee/update-employee-info.dto';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Employee } from '@app/common/database/entities/employee/employee.entity';
// import { Repository } from 'typeorm';
// import { PinoLogger } from 'nestjs-pino';
// import { Skill } from '@app/common/database/entities/employee/skill.entity';
// import { Experience } from '@app/common/database/entities/employee/experience.entity';
// import { CareerScope } from '@app/common/database/entities/career-scope.entity';
// import { Social } from '@app/common/database/entities/social.entity';
// import { Education } from '@app/common/database/entities/employee/education.entity';
// import { EmployeeResponseDTO } from '../../dtos/user-response.dto';
// import { RpcException } from '@nestjs/microservices';

// @Injectable()
// export class UpdateEmployeeInfoService {
//   constructor(
//     @InjectRepository(Employee)
//     private readonly employeeRepository: Repository<Employee>,
//     @InjectRepository(Skill)
//     private readonly skillRepository: Repository<Skill>,
//     @InjectRepository(Experience)
//     private readonly experienceRepository: Repository<Experience>,
//     @InjectRepository(CareerScope)
//     private readonly careerScopeRepository: Repository<CareerScope>,
//     @InjectRepository(Social)
//     private readonly socialRepository: Repository<Social>,
//     @InjectRepository(Education)
//     private readonly educationRepository: Repository<Education>,
//     private readonly logger: PinoLogger,
//   ) {}

//   async updateEmployeeInfo(
//     updateEmployeeInfoDTO: UpdateEmployeeInfoDTO,
//     employeeId: string,
//   ): Promise<{ message: string; employee: EmployeeResponseDTO }> {
//     try {
//       // Find existing employee with relations
//       let employee = await this.employeeRepository.findOne({
//         where: { id: employeeId },
//         relations: [
//           'skills',
//           'experiences',
//           'careerScopes',
//           'socials',
//           'educations',
//         ],
//       });
//       if (!employee)
//         throw new RpcException({
//           message: 'There is no employee with this ID.',
//           statusCode: 404,
//         });

//       // Merge new values into existing fields
//       Object.assign(employee, updateEmployeeInfoDTO);

//       // Merge and update relations
//       if (updateEmployeeInfoDTO.skills) {
//         const existingSkills = await this.skillRepository.findBy({
//           employees: { id: employeeId },
//         });
//         const newSkills = updateEmployeeInfoDTO.skills.map((skill) =>
//           this.skillRepository.create(skill),
//         );
//         employee.skills = [...existingSkills, ...newSkills]; // Keep existing skills + add new ones
//         await this.skillRepository.save(newSkills); // Save only new skills
//       }

//       if (updateEmployeeInfoDTO.experiences) {
//         const existingExperiences = await this.experienceRepository.findBy({
//           employee: { id: employeeId },
//         });
//         const newExperiences = updateEmployeeInfoDTO.experiences.map((exp) =>
//           this.experienceRepository.create(exp),
//         );
//         employee.experiences = [...existingExperiences, ...newExperiences];
//         await this.experienceRepository.save(newExperiences);
//       }

//       if (updateEmployeeInfoDTO.careerScopes) {
//         const existingCareerScopes = await this.careerScopeRepository.findBy({
//           employees: { id: employeeId },
//         });
//         const newCareerScopes = updateEmployeeInfoDTO.careerScopes.map((cs) =>
//           this.careerScopeRepository.create(cs),
//         );
//         employee.careerScopes = [...existingCareerScopes, ...newCareerScopes];
//         await this.careerScopeRepository.save(newCareerScopes);
//       }

//       if (updateEmployeeInfoDTO.socials) {
//         const existingSocials = await this.socialRepository.findBy({
//           employee: { id: employeeId },
//         });
//         const newSocials = updateEmployeeInfoDTO.socials.map((social) =>
//           this.socialRepository.create(social),
//         );
//         employee.socials = [...existingSocials, ...newSocials];
//         await this.socialRepository.save(newSocials);
//       }

//       if (updateEmployeeInfoDTO.educations) {
//         const existingEducations = await this.educationRepository.findBy({
//           employee: { id: employeeId },
//         });
//         const newEducations = updateEmployeeInfoDTO.educations.map((edu) =>
//           this.educationRepository.create(edu),
//         );
//         employee.educations = [...existingEducations, ...newEducations];
//         await this.educationRepository.save(newEducations);
//       }

//       // Save updated employee entity
//       await this.employeeRepository.save(employee);

//       return {
//         message: 'Employee information updated successfully',
//         employee: new EmployeeResponseDTO(employee),
//       };
//     } catch (error) {
//       // Handle error
//       this.logger.error(
//         (error as Error).message ||
//           "An error occurred while updating the employee's information.",
//       );
//       throw new RpcException({
//         message:
//           (error as Error).message ||
//           "An error occurred while updating the employee's information.",
//         statusCode: 500,
//       });
//     }
//   }
// }

import { Injectable } from '@nestjs/common';
import { UpdateEmployeeInfoDTO } from '../../dtos/employee/update-employee-info.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { EmployeeResponseDTO } from '../../dtos/user-response.dto';
import { RpcException } from '@nestjs/microservices';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';

@Injectable()
export class UpdateEmployeeInfoService {
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
    private readonly redisService: RedisService,
  ) {}

  async updateEmployeeInfo(
    updateEmployeeInfoDTO: UpdateEmployeeInfoDTO,
    employeeId: string,
  ): Promise<{ message: string; employee: EmployeeResponseDTO }> {
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
        ...scalarFields
      } = updateEmployeeInfoDTO as any;

      /* =======================================================
         1️⃣ UPDATE SCALAR FIELDS
      ======================================================= */
      Object.assign(employee, scalarFields);
      await this.employeeRepository.save(employee);

      /* =======================================================
         2️⃣ SKILLS (M2M SAFE) by name
      ======================================================= */
      if (Array.isArray(skills)) {
        const finalIds: string[] = [];

        for (const s of skills) {
          const id = s?.id;
          const name = (s?.name ?? '').trim();

          if (id) {
            finalIds.push(id);
            continue;
          }
          if (!name) continue;

          const existing = await this.skillRepository.findOne({
            where: { name },
          });
          if (existing) {
            finalIds.push(existing.id);
          } else {
            const created = await this.skillRepository.save(
              this.skillRepository.create({
                name,
                description: s?.description ?? null,
              }),
            );
            finalIds.push(created.id);
          }
        }

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
        const finalIds: string[] = [];

        for (const cs of careerScopes) {
          if (cs?.id) {
            finalIds.push(cs.id);
            continue;
          }

          const name = (cs?.name ?? '').trim();
          if (!name) continue;

          const existing = await this.careerScopeRepository.findOne({
            where: { name },
          });
          if (existing) {
            finalIds.push(existing.id);
          } else {
            const created = await this.careerScopeRepository.save(
              this.careerScopeRepository.create({
                name,
                description: cs?.description ?? null,
              }),
            );
            finalIds.push(created.id);
          }
        }

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
        for (const expDto of experiences) {
          if (expDto?.id) {
            const existing = await this.experienceRepository.findOne({
              where: { id: expDto.id, employee: { id: employeeId } },
            });

            if (existing) {
              const { id: _, ...updateData } = expDto;
              Object.assign(existing, updateData);
              await this.experienceRepository.save(existing);
            }
          } else {
            await this.experienceRepository.save(
              this.experienceRepository.create({
                ...expDto,
                employee,
              }),
            );
          }
        }
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
        for (const eduDto of educations) {
          if (eduDto?.id) {
            const existing = await this.educationRepository.findOne({
              where: { id: eduDto.id, employee: { id: employeeId } },
            });

            if (existing) {
              const { id: _, ...updateData } = eduDto;
              Object.assign(existing, updateData);
              await this.educationRepository.save(existing);
            }
          } else {
            await this.educationRepository.save(
              this.educationRepository.create({
                ...eduDto,
                employee,
              }),
            );
          }
        }
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
        for (const socialDto of socials) {
          if (socialDto?.id) {
            const existing = await this.socialRepository.findOne({
              where: { id: socialDto.id, employee: { id: employeeId } },
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
                employee,
              }),
            );
          }
        }

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
      const userId =
        freshEmployee?.user?.id ??
        employee.user?.id ??
        (
          await this.userRepository.findOne({
            where: { employee: { id: employeeId } },
            select: ['id'],
          })
        )?.id;

      if (userId) {
        const keysToDelete = [
          this.redisService.generateUserKey('detail', userId),
          this.redisService.generateListKey('user', {}),
        ];

        await Promise.all(keysToDelete.map((k) => this.redisService.del(k)));
      }

      return {
        message: 'Employee information updated successfully',
        employee: new EmployeeResponseDTO(freshEmployee ?? employee),
      };
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
