import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Application } from './application.entity';
import { User } from './user.entity';

/**
 * A recruiter-private note attached to one application. Visible only to
 * accounts belonging to the owning company; never surfaced on the candidate
 * side. `author` records who wrote it so the drawer can show "Rita, 3 days
 * ago" without a second lookup.
 */
@Index(['application', 'createdAt'])
@Entity()
export class ApplicationNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn()
  application: Application;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  author: User | null;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn()
  createdAt: Date;
}
