import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { EntityTarget, In, ObjectLiteral, QueryRunner } from 'typeorm';

/**
 * Bulk find-or-create for the shared lookup tables used during registration.
 *
 * Registration submits reference data by name (benefits, values, career scopes,
 * skills); rows that already exist must be reused rather than duplicated. All
 * four wrappers below were the same routine written out per entity — this keeps
 * the read/insert/merge in one place, inside the caller's transaction.
 */
async function findOrCreateBy<T extends ObjectLiteral>(
  queryRunner: QueryRunner,
  entity: EntityTarget<T>,
  key: string,
  rows: Record<string, unknown>[],
): Promise<T[]> {
  if (!rows.length) return [];
  const keys = rows.map((row) => row[key]);
  const existing = await queryRunner.manager.find(entity, {
    where: { [key]: In(keys) },
  } as never);
  const seen = new Set(existing.map((row) => (row as ObjectLiteral)[key]));
  const toCreate = rows
    .filter((row) => !seen.has(row[key]))
    .map((row) => queryRunner.manager.create(entity, row as never));
  const created = toCreate.length
    ? ((await queryRunner.manager.save(
        entity,
        toCreate as never,
      )) as unknown as T[])
    : [];
  return [...existing, ...created];
}

export function findOrCreateBenefits(
  labels: string[],
  queryRunner: QueryRunner,
): Promise<Benefit[]> {
  return findOrCreateBy(
    queryRunner,
    Benefit,
    'label',
    labels.map((label) => ({ label })),
  );
}

export function findOrCreateValues(
  labels: string[],
  queryRunner: QueryRunner,
): Promise<Value[]> {
  return findOrCreateBy(
    queryRunner,
    Value,
    'label',
    labels.map((label) => ({ label })),
  );
}

export function findOrCreateCareerScopes(
  names: string[],
  queryRunner: QueryRunner,
): Promise<CareerScope[]> {
  return findOrCreateBy(
    queryRunner,
    CareerScope,
    'name',
    names.map((name) => ({ name })),
  );
}

export function findOrCreateSkills(
  skills: { name: string; description?: string }[],
  queryRunner: QueryRunner,
): Promise<Skill[]> {
  return findOrCreateBy(queryRunner, Skill, 'name', skills);
}
