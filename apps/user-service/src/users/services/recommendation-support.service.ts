import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toVectorLiteral } from '../utils/recommendations-scoring.util';

/**
 * Retrieval steps shared by both recommendation directions: block detection and
 * the pgvector ANN lookup. Kept as one collaborator so the employee-side and
 * company-side services stay independent of each other.
 */
@Injectable()
export class RecommendationSupportService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
  ) {}

  /**
   * Whether the user is on either side of any block. When true, feeds /
   * recommendations must bypass the cache so block/unblock reflects instantly
   * (cache-manager v7 pattern invalidation is a no-op here).
   */
  async requesterHasBlocks(userId: string): Promise<boolean> {
    const rows = await this.userRepository.query(
      'SELECT 1 FROM user_block WHERE "blockerId" = $1 OR "blockedId" = $1 LIMIT 1',
      [userId],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  /**
   * Career-scope ids nearest to a query vector, using the HNSW cosine index
   * (idx_career_scope_embedding_hnsw). This is the ANN retrieval step that lets
   * Postgres — not Node — do the heavy similarity search over all scopes.
   */
  async nearestScopeIds(queryVec: number[], k: number): Promise<string[]> {
    const rows = await this.careerScopeRepository
      .createQueryBuilder('cs')
      .select('cs.id', 'id')
      .where('cs.embedding IS NOT NULL')
      .orderBy('cs.embedding <=> CAST(:qvec AS vector)', 'ASC')
      .setParameter('qvec', toVectorLiteral(queryVec))
      .limit(k)
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }
}
