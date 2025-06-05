import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { JobMatching } from "./job-matching.entity";

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

    @Column({ type: 'enum', enum: ['text', 'image', 'document'], default: 'text' })
    messageType: string;

    @CreateDateColumn()
    sentAt: Date;
}