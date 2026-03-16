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

  /** URL of uploaded file or image. Null for plain text messages. */
  @Column({ nullable: true, type: 'text' })
  attachment: string | null;

  @Column({
    type: 'enum',
    enum: EMessageType,
    default: EMessageType.TEXT,
  })
  messageType: EMessageType;

  @Column({ type: 'jsonb', default: {} })
  reactions: Record<string, string>;

  /**
   * Soft-delete flag.
   * When true the message body is hidden on the frontend (shows tombstone
   * "This message was deleted"). The DB row is kept so that:
   *  - read-receipts still work
   *  - reply-to references don't become broken foreign keys
   */
  @Column({ default: false })
  isDeleted: boolean;

  /**
   * Edit flag.
   * Set to true when the sender edits their message content.
   * Shown as a small "(edited)" label in the bubble so both parties know
   * the original wording may have changed.
   */
  @Column({ default: false })
  isEdited: boolean;

  /**
   * Reply-to reference (UUID of parent message or null).
   * We store only the ID — not a full FK relation — so that deleting
   * the quoted message doesn't cascade-delete the reply chain.
   * Frontend reads this field to render the inline quote block.
   */
  @Column({ nullable: true, type: 'uuid' })
  replyToId: string | null;

  @CreateDateColumn()
  sentAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
