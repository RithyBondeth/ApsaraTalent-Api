import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EWorkMode } from '../../enums/work-mode.enum';
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

  @Column()
  skillsRequired: string;

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

  @Column({ type: 'int', nullable: true })
  openingsCount: number | null;

  @Column({ nullable: true })
  expireDate: Date;

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
