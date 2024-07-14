import { TrainingBatchUpdateRequest, TrainingDto } from './dto';

export async function markTrainingsAsCompensated(
  accessToken: string,
  ids: number[],
): Promise<void> {
  const request: TrainingBatchUpdateRequest = {
    operations: ids.map((id) => ({ id: id, operation: 'SET_COMPENSATED' })),
  };

  await fetch('/api/trainings', {
    method: 'PATCH',
    body: JSON.stringify(request),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}
