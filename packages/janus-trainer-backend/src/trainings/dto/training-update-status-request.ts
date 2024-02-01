import { IsEnum } from 'class-validator';
import { TrainingStatus } from '../trainings.entity';

export class TrainingUpdateStatusRequest {
  @IsEnum(TrainingStatus)
  status: TrainingStatus;
}
