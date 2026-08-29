import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { IsNull, Repository } from 'typeorm';
import {
  FindCurrentMatchingResponseDTO,
  MatchCountResponseDTO,
  EmployeeMatchingLookupDTO,
  CompanyMatchingLookupDTO,
  FindCurrentLikeResponseDTO,
} from '@app/contracts/dtos/job';
import { IMatchingQueryService } from '@app/contracts/interfaces/service/job-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import { generateMatchingKey } from '@app/common/redis/redis-keys.util';

/**
 * Read side of matching: the cached lists and counts of likes and mutual
 * matches for either party. Mutations (likes, unmatch) live in MatchingService.
 */
@Injectable()
export class MatchingQueryService implements IMatchingQueryService {
  constructor(
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  async findCurrentEmployeeLiked(
    employeeMatchingLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    const cacheKey = generateMatchingKey(
      'employee-liked',
      employeeMatchingLookupDTO.eid,
    );
    const cached =
      await this.redisService.get<FindCurrentLikeResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const employeeLiked = await this.jobMatchingRepo.find({
        where: {
          employee: { id: employeeMatchingLookupDTO.eid },
          employeeLiked: true,
        },
        relations: [
          'company',
          'company.openPositions',
          'company.openPositions.requiredSkills',
        ],
      });

      if (!employeeLiked)
        throw new RpcException({
          message: 'Employee Liked not found',
          statusCode: 404,
        });

      const result = employeeLiked.map(
        (e) => new FindCurrentLikeResponseDTO(e.company),
      );
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while fetching the employee liked.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while fetching the employee liked.',
        statusCode: 500,
      });
    }
  }

  async findCurrentCompanyLiked(
    companyMatchingLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    const cacheKey = generateMatchingKey(
      'company-liked',
      companyMatchingLookupDTO.cid,
    );
    const cached =
      await this.redisService.get<FindCurrentLikeResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const companyLiked = await this.jobMatchingRepo.find({
        where: {
          company: { id: companyMatchingLookupDTO.cid },
          companyLiked: true,
        },
        relations: ['employee', 'employee.skills'],
      });

      if (!companyLiked)
        throw new RpcException({
          message: 'Company Liked not found',
          statusCode: 404,
        });

      const result = companyLiked.map(
        (c) => new FindCurrentLikeResponseDTO(c.employee),
      );
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while fetching the company liked.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while fetching the company liked.',
        statusCode: 500,
      });
    }
  }

  async findCurrentEmployeeMatching(
    employeeMatchingLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]> {
    const cacheKey = generateMatchingKey(
      'employee-matching',
      employeeMatchingLookupDTO.eid,
    );
    const cached =
      await this.redisService.get<FindCurrentMatchingResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentEmployeeMatching = await this.jobMatchingRepo.find({
        where: {
          employee: { id: employeeMatchingLookupDTO.eid },
          isMatched: true,
        },
        relations: [
          'company.openPositions',
          'company.openPositions.requiredSkills',
        ],
      });

      if (!currentEmployeeMatching)
        throw new RpcException({
          message: 'There is no matching.',
          statusCode: 404,
        });

      const result = currentEmployeeMatching.map((match) => {
        const dto = new FindCurrentMatchingResponseDTO(match.company as any);
        dto.skillScore = match.skillScore ?? null;
        dto.matchScore = match.matchScore ?? null;
        return dto;
      });
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while fetching the employee matching.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while fetching the employee matching.',
        statusCode: 500,
      });
    }
  }

  async findCurrentCompanyMatching(
    companyMatchingLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]> {
    const cacheKey = generateMatchingKey(
      'company-matching',
      companyMatchingLookupDTO.cid,
    );
    const cached =
      await this.redisService.get<FindCurrentMatchingResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentCompanyMatching = await this.jobMatchingRepo.find({
        where: {
          company: { id: companyMatchingLookupDTO.cid },
          isMatched: true,
        },
        relations: ['employee.skills'],
      });

      if (!currentCompanyMatching)
        throw new RpcException({
          message: 'There is no matching.',
          statusCode: 404,
        });

      const result = currentCompanyMatching.map((match) => {
        const dto = new FindCurrentMatchingResponseDTO(match.employee as any);
        dto.skillScore = match.skillScore ?? null;
        dto.matchScore = match.matchScore ?? null;
        return dto;
      });
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while fetching the company matching.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while fetching the company matching.',
        statusCode: 500,
      });
    }
  }

  async findCurrentEmployeeMatchingCount(
    employeeMatchingLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    const cacheKey = generateMatchingKey(
      'employee-matching-count-v2',
      employeeMatchingLookupDTO.eid,
    );
    const cached = await this.redisService.get<MatchCountResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const where = {
        employee: { id: employeeMatchingLookupDTO.eid },
        isMatched: true,
      };
      /*
        The badge number is resolved here, not on the client. A null seen
        timestamp means this side has never opened their matching list, so the
        row is still new to them.
      */
      const [count, unseenCount] = await Promise.all([
        this.jobMatchingRepo.count({ where }),
        this.jobMatchingRepo.count({
          where: { ...where, employeeSeenAt: IsNull() },
        }),
      ]);
      const result = new MatchCountResponseDTO({ count, unseenCount });
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while counting the current employee matching.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while counting the current employee matching.',
        statusCode: 500,
      });
    }
  }

  async findCurrentCompanyMatchingCount(
    companyMatchingLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    const cacheKey = generateMatchingKey(
      'company-matching-count-v2',
      companyMatchingLookupDTO.cid,
    );
    const cached = await this.redisService.get<MatchCountResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const where = {
        company: { id: companyMatchingLookupDTO.cid },
        isMatched: true,
      };
      // See findCurrentEmployeeMatchingCount — same rule, other side.
      const [count, unseenCount] = await Promise.all([
        this.jobMatchingRepo.count({ where }),
        this.jobMatchingRepo.count({
          where: { ...where, companySeenAt: IsNull() },
        }),
      ]);
      const result = new MatchCountResponseDTO({ count, unseenCount });
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while counting the current company matching.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while counting the current company matching.',
        statusCode: 500,
      });
    }
  }
}
