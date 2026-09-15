import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ESavedSearchFrequency } from '../enums/saved-search-frequency.enum';
import { Employee } from './employee/employee.entity';

/**
 * A saved search on the job feed, owned by one employee.
 *
 * `filters` is a jsonb of the `SearchJobDTO` shape — deliberately loose so
 * adding a new filter field on the search form does not need a migration
 * here. The dispatcher passes it back through `JobService.searchJobs`
 * verbatim, which is the same call the search page runs, so a saved digest
 * matches what the user would see if they opened their saved query.
 *
 * `lastResultJobIds` is the set the last digest surfaced. The next tick's
 * "new since" answer is the incoming result minus this set — comparing to a
 * timestamp alone would also flag jobs the user already saw a week ago just
 * because their `updatedAt` moved.
 *
 * Indexed by (frequency, lastNotifiedAt) so the dispatcher's due-lookup
 * scans a narrow slice of the table rather than the whole thing.
 */
@Index(['frequency', 'lastNotifiedAt'])
@Entity()
export class SavedSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn()
  employee: Employee;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'jsonb' })
  filters: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: ESavedSearchFrequency,
    default: ESavedSearchFrequency.DAILY,
  })
  frequency: ESavedSearchFrequency;

  /** When the dispatcher last sent a digest for this search. */
  @Column({ type: 'timestamptz', nullable: true })
  lastNotifiedAt: Date | null;

  /**
   * Job ids in the most recent digest. Kept as a text array (not a relation)
   * because a job may be deleted between ticks and the diff should still
   * work — a foreign key would either cascade the row away or refuse the
   * write, and both are worse than a stale id the dispatcher ignores.
   */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  lastResultJobIds: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
