import { IsString, IsArray } from 'class-validator';

export class TrainingsBatchOperation {
  @IsString()
  id: string;
  @IsString()
  operation: 'SET_COMPENSATED';
}

export class BatchApproveTrainingsRequest {
  @IsArray()
  operations: TrainingsBatchOperation[];
}
