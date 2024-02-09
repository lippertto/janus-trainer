import { IsEnum } from 'class-validator';
import { TrainingStatus } from '../training.entity';

export class TrainingUpdateStatusRequest {
  @IsEnum(TrainingStatus)
  status: TrainingStatus;
}
