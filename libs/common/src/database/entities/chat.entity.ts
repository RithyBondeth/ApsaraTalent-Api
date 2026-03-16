import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EMessageType } from '../enums/message-type.enum';
import { JobMatching } from './job-matching.entity';
import { User } from './user.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  receiver: User;

  @ManyToOne(() => JobMatching, { nullable: true, onDelete: 'CASCADE' })
  jobMatching: JobMatching;

  @Column('text')
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  attachment: string;

  @Column({
    type: 'enum',
    enum: EMessageType,
    default: EMessageType.TEXT,
  })
  messageType: EMessageType;

  @Column({ type: 'jsonb', default: {} })
  reactions: Record<string, string>;

  @CreateDateColumn()
  sentAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
