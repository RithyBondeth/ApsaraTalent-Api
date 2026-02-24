import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from './company.entity';

@Entity()
export class Benefit {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  label: string;

  @ManyToMany(() => Company, (company) => company.benefits)
  companies: Company[];
}
