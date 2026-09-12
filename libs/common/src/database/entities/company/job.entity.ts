import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EWorkMode } from '../../enums/work-mode.enum';
import { Skill } from '../employee/skill.entity';
import { Company } from './company.entity';

@Entity()
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, (company) => company.openPositions, {
    onDelete: 'CASCADE',
  })
  company: Company;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  type: string;

  @Column()
  experienceRequired: string;

  @Column()
  educationRequired: string;

  /**
   * Legacy comma-joined skill names. Still written alongside the `skills`
   * relation below so a rollback keeps working; a later release drops it.
   * Read it through `getJobSkillNames`, never directly.
   */
  @Column()
  skillsRequired: string;

  /**
   * The same `Skill` rows employees are tagged with, so a candidate's skills
   * and a role's requirements share one vocabulary instead of being compared
   * across a normalized table and a free-text string.
   */
  @ManyToMany(() => Skill, (skill) => skill.jobs, { cascade: false })
  @JoinTable({
    name: 'job_skills_skill',
    joinColumn: { name: 'jobId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skillId', referencedColumnName: 'id' },
  })
  requiredSkills: Skill[];

  @Column({ nullable: true })
  salary: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salaryMin: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salaryMax: number | null;

  @Column({ length: 10, nullable: true })
  salaryCurrency: string | null;

  @Column({
    type: 'enum',
    enum: EWorkMode,
    nullable: true,
  })
  workMode: EWorkMode | null;

  @Column({ nullable: true })
  location: string | null;

  // Mirrors `Employee.languages` so a role's language requirements and a
  // candidate's languages are stored and compared the same way.
  @Column({ type: 'simple-array', nullable: true })
  languagesRequired: string[] | null;

  @Column({ type: 'int', nullable: true })
  openingsCount: number | null;

  @Column({ nullable: true })
  expireDate: Date | null;

  @Column({
    type: 'text',
    nullable: true,
    select: false,
    synchronize: false,
  } as any)
  titleEmbedding: string | null;

  /**
   * Set when an administrator takes this posting down. Null means visible.
   *
   * This is a TypeORM `@DeleteDateColumn`, which is what makes the takedown
   * safe rather than merely recorded. Jobs reach candidates through roughly
   * fifteen read paths across three services — job search, the feed, company
   * detail, both recommendation services, favourites, matching and the AI
   * matching prompt — and most of them arrive indirectly, as
   * `company.openPositions` joined onto a company query. Adding a status
   * column would mean finding and filtering every one of them, and the first
   * one missed is a scam posting still being shown to candidates.
   *
   * A soft-delete column is filtered by TypeORM itself, on the entity and on
   * joined relations alike, so a hidden job disappears everywhere by default
   * and reappearing anywhere requires someone to explicitly write
   * `withDeleted`. The default is safe; the exception is greppable.
   *
   * Named `hiddenAt` rather than `deletedAt` because it is moderation, not
   * deletion: a company removing its own posting still hard-deletes the row
   * (`open-position.service.ts`), which is unchanged by this.
   */
  @Index()
  @DeleteDateColumn({ name: 'hiddenAt', type: 'timestamptz', nullable: true })
  hiddenAt: Date | null;

  /** Why it was taken down. Shown to the company that posted it. */
  @Column({ type: 'text', nullable: true })
  hiddenReason: string | null;

  /**
   * The administrator who took it down. No foreign key, for the same reason
   * as `admin_audit_log.targetUserId`: the record must outlive the account.
   */
  @Column({ type: 'uuid', nullable: true })
  hiddenBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
