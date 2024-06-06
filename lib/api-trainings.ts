import { bigIntReviver } from './json-tools';
import { TrainingBatchUpdateRequest, TrainingDto } from './dto';


export async function approveTraining(
  accessToken: string,
  id: string,
): Promise<TrainingDto> {
  const response = await fetch(`/api/trainings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'APPROVED' }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.text();
  return JSON.parse(data, bigIntReviver) as TrainingDto;
}

export async function unapproveTraining(
  accessToken: string,
  id: string,
): Promise<TrainingDto> {
  const response = await fetch(`/api/trainings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'NEW' }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.text();
  return JSON.parse(data, bigIntReviver) as TrainingDto;
}

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
