import { Training } from '../trainings/training.entity';
import {
  BaseEntity,
  Column,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Discipline extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Training, (training) => training.discipline)
  trainings: Promise<Training[]>;

  @DeleteDateColumn()
  deletedDate: Date;
}
