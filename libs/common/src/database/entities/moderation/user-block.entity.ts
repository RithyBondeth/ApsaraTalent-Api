import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../user.entity';

@Entity()
@Unique(['blocker', 'blocked'])
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  blocker: User;

  @Index()
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  blocked: User;

  @CreateDateColumn()
  createdAt: Date;
}
