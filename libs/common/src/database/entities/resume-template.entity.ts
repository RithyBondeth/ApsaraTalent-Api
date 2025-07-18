import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ResumeTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    image: string;

    @Column()
    title: string;

    @Column()
    description: string;

    @Column({ type: 'double precision', nullable: true })
    price: number;

    @Column({ default: false })
    isPremium: boolean;   
    
    @CreateDateColumn()
    createdAt: Date;
}