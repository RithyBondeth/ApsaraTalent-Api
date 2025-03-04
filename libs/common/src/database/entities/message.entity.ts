import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee/employee.entiry";
import { User } from "./user.entiry";

@Entity()
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
    
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    receiver: User;

    @Column('text')
    message: string;

    @Column({ default: false })
    isRead: boolean;

    @CreateDateColumn()
    sentAt: Date;
}