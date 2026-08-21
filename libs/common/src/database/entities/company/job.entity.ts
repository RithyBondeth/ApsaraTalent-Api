import {
  Column,
  CreateDateColumn,
  Entity,
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

  @CreateDateColumn()
  createdAt: Date;
}
