import { IsEnum } from 'class-validator';
import { TrainingStatusDto } from './TrainingDto';

export class TrainingUpdateStatusRequest {
  @IsEnum(TrainingStatusDto)
  status: TrainingStatusDto;
}
