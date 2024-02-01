import { ErrorResponse } from '../../error.dto';

export class TrainingsBatchApproveResponse {
  value: ('OK' | ErrorResponse)[];
}
