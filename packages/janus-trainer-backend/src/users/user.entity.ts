import { Training } from '../trainings/training.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  OneToMany,
} from 'typeorm';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  iban: string;

  /** This is a copy of the cognito name property. */
  @Column()
  name: string;

  @OneToMany(() => Training, (training) => training.user)
  trainings: Training[];

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
