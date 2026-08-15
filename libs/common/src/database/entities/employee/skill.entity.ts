import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Job } from '../company/job.entity';
import { Employee } from './employee.entity';

@Entity()
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Employee, (employee) => employee.skills)
  employees: Employee[];

  /** Open positions requiring this skill — the inverse of `Job.requiredSkills`. */
  @ManyToMany(() => Job, (job) => job.requiredSkills)
  jobs: Job[];
}
