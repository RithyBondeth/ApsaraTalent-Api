import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  computeMatchScore,
  computeSkillScore,
} from '../utils/matching-score.util';

/** Which side of the pair is expressing interest. */
export type TInterestSide = 'employee' | 'company';

export interface IRecordInterestResult {
  match: JobMatching;
  /** True only on the transition into a match, never on a repeat. */
  becameMatched: boolean;
  employee: Employee;
  company: Company;
}

/**
 * One definition of "this side has said yes".
 *
 * `employeeLikes` and `companyLikes` carried the same forty lines twice —
 * load both parties, upsert the row, rescore, flip `isMatched` when the second
 * side arrives — differing only in which boolean they set. Applications now
 * need exactly the same thing, and a third copy is where the three would start
 * to disagree about what a match is.
 *
 * The callers keep what is genuinely theirs: the swipe paths clear the
 * corresponding favourite and send their own notifications, and the
 * application paths send application notifications instead.
 */
@Injectable()
export class MatchLinkService {
  constructor(
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Record that one side is interested, creating the pairing if it is the
   * first to arrive, and promoting it to a match when both booleans are set.
   *
   * Scores are recomputed on every call rather than only on insert: a
   * candidate who filled in their skills after swiping would otherwise keep
   * the null score they were first written with.
   */
  async recordInterest(
    employeeId: string,
    companyId: string,
    side: TInterestSide,
  ): Promise<IRecordInterestResult> {
    const [employee, company] = await Promise.all([
      this.employeeRepo.findOne({
        where: { id: employeeId },
        relations: ['user', 'skills'],
      }),
      this.companyRepo.findOne({
        where: { id: companyId },
        relations: ['user', 'openPositions', 'openPositions.requiredSkills'],
      }),
    ]);

    if (!employee || !company) {
      throw new RpcException({
        message: 'Employee or Company not found.',
        statusCode: 404,
      });
    }

    let match = await this.jobMatchingRepo.findOne({
      where: { employee: { id: employeeId }, company: { id: companyId } },
      relations: ['employee', 'company'],
    });

    const skillScore = computeSkillScore(employee, company);
    const matchScore = computeMatchScore(employee, company).score;

    if (!match) {
      match = this.jobMatchingRepo.create({
        employee,
        company,
        employeeLiked: side === 'employee',
        companyLiked: side === 'company',
        isMatched: false,
        skillScore,
        matchScore,
      });
    } else {
      if (side === 'employee') match.employeeLiked = true;
      else match.companyLiked = true;
      match.skillScore = skillScore;
      match.matchScore = matchScore;
    }

    const becameMatched =
      !match.isMatched && match.employeeLiked && match.companyLiked;
    if (becameMatched) match.isMatched = true;

    const saved = await this.jobMatchingRepo.save(match);

    /*
      Invalidated here rather than at each call site: every path that writes
      this row leaves the same caches stale, and the one that forgets is the
      one that ships a match the other side cannot see.
    */
    await this.redisService.invalidateMatchingCaches(employeeId, companyId);

    return { match: saved, becameMatched, employee, company };
  }

  /**
   * Whether these two *auth users* are currently matched.
   *
   * Chat identifies people by auth user id while a match is keyed on the
   * employee and company profiles, so the pair is resolved here rather than at
   * the caller. A conversation is always employee-to-company: two employees or
   * two companies have no pairing to check and are never matched.
   *
   * Returns false rather than throwing on a missing profile — the caller is an
   * access check, and "not matched" is the right answer for a user who has no
   * profile on either side.
   */
  async areUsersMatched(userIdA: string, userIdB: string): Promise<boolean> {
    if (!userIdA || !userIdB || userIdA === userIdB) return false;

    const [employee, company] = await Promise.all([
      this.employeeRepo.findOne({
        where: [{ user: { id: userIdA } }, { user: { id: userIdB } }],
        relations: ['user'],
      }),
      this.companyRepo.findOne({
        where: [{ user: { id: userIdA } }, { user: { id: userIdB } }],
        relations: ['user'],
      }),
    ]);

    if (!employee || !company) return false;

    // Guard against both ids resolving through the same side, which would
    // otherwise pair one person's employee profile with someone else's company.
    const ids = [employee.user?.id, company.user?.id];
    if (!ids.includes(userIdA) || !ids.includes(userIdB)) return false;

    const match = await this.jobMatchingRepo.findOne({
      where: {
        employee: { id: employee.id },
        company: { id: company.id },
        isMatched: true,
      },
    });

    return !!match;
  }
}
