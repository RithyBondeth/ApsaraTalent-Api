import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn
} from 'typeorm';
import { EGender } from '../../enums/gender.enum';
import { CareerScope } from '../career-scope.entity';
import { Social } from '../social.entity';
import { User } from '../user.entity';
import { Education } from './education.entity';
import { Experience } from './experience.entity';
import { EmployeeFavoriteCompany } from './favorite-company.entity';
import { Skill } from './skill.entity';

@Entity()
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.employee, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  firstname: string;

  @Column({ nullable: true })
  lastname: string;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'enum', enum: EGender, default: EGender.OTHER })
  gender: EGender;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  job: string;

  @Column({ nullable: true })
  yearsOfExperience: string;

  @Column()
  availability: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  resume: string;

  @Column({ nullable: true })
  coverLetter: string;

  @ManyToMany(() => Skill, (skill) => skill.employees)
  @JoinTable()
  skills: Skill[];

  @OneToMany(() => Education, (education) => education.employee, {
    cascade: true,
  })
  educations: Education[];

  @OneToMany(() => Experience, (experience) => experience.employee, {
    cascade: true,
  })
  experiences: Experience[];

  @ManyToMany(() => CareerScope, (careerScope) => careerScope.employees)
  @JoinTable()
  careerScopes: CareerScope[];

  @OneToMany(() => Social, (social) => social.employee, { cascade: true })
  socials: Social[];

  @Column({ type: 'boolean', default: false })
  isHide: boolean;

  @OneToMany(
    () => EmployeeFavoriteCompany,
    (empFavoriteCmp) => empFavoriteCmp.employee,
  )
  favorites: EmployeeFavoriteCompany[];

  @CreateDateColumn()
  createdAt: Date;
}
