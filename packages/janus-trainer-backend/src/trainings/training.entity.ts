import { TrainingStatusDto } from 'janus-trainer-dto/dist/src/TrainingDto';
import { Discipline } from '../disciplines/discipline.entity';
import { User } from '../users/user.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Training extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Discipline, (discipline) => discipline.trainings)
  discipline: Discipline;

  @Column()
  group: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  compensationCents: number;

  @ManyToOne(() => User, (user) => user.trainings)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  participantCount: number;

  @Column({
    type: 'varchar',
    enum: TrainingStatusDto,
  })
  status: TrainingStatusDto;
}
