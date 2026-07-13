import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

/**
 * Resolves the User.id from any combination of:
 *  - a raw User UUID
 *  - an Employee UUID (looks up via employee join)
 *  - a Company UUID  (looks up via company join)
 */
export async function resolveUserId(
  userRepository: Repository<User>,
  id: string,
): Promise<string> {
  const byUserId = await userRepository.findOne({ where: { id } });
  if (byUserId) {
    return byUserId.id;
  }
  const byEmployee = await userRepository.findOne({
    where: { employee: { id } },
    relations: ['employee'],
  });
  if (byEmployee) return byEmployee.id;
  const byCompany = await userRepository.findOne({
    where: { company: { id } },
    relations: ['company'],
  });
  if (byCompany) return byCompany.id;

  throw new Error(`Could not resolve user ID from: ${id}`);
}

export async function resolveUserIdSafe(
  userRepository: Repository<User>,
  id: string,
): Promise<string | null> {
  try {
    return await resolveUserId(userRepository, id);
  } catch {
    return null;
  }
}
