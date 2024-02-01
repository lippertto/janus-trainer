import { User } from '../users/user.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TrainingStatus {
  NEW = 'NEW',
  APPROVED = 'APPROVED',
  COMPENSATED = 'COMPENSATED',
}

@Entity()
export class Training extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  discipline: string;

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

  @Column({ enum: TrainingStatus })
  status: TrainingStatus;
}
