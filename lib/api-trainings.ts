import { bigIntReviver } from './json-tools';
import { TrainingQueryResponse } from '@/app/api/trainings/route';
import dayjs from 'dayjs';
import {
  TrainingBatchUpdateRequest,
  TrainingDtoNew,
  TrainingUpdateRequest,
  TrainingCreateRequest,
} from './dto';

export async function getTrainingsForUser(
  accessToken: string,
  userId: string,
): Promise<TrainingDtoNew[]> {
  const response = await fetch(`/api/trainings?userId=${userId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status !== 200) {
    return Promise.reject(new Error('Could not retrieve trainings'));
  }
  const data = await response.text();
  const body = JSON.parse(data, bigIntReviver) as TrainingQueryResponse;

  return body.value;
}

export async function getTrainingsForPeriod(
  accessToken: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): Promise<TrainingDtoNew[]> {
  const response = await fetch(
    `/api/trainings?start=${startDate.format(
      'YYYY-MM-DD',
    )}&end=${endDate.format('YYYY-MM-DD')}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.text();
  const body = JSON.parse(data, bigIntReviver) as TrainingQueryResponse;
  return body.value;
}

export async function addTraining(
  accessToken: string,
  date: string,
  disciplineId: number,
  group: string,
  compensationCents: number,
  participantCount: number,
  userId: string,
): Promise<TrainingDtoNew> {
  const request: TrainingCreateRequest = {
    date,
    disciplineId,
    group,
    compensationCents,
    participantCount,
    userId,
  };

  const response = await fetch(`/api/trainings`, {
    method: 'POST',
    body: JSON.stringify(request),
    cache: 'no-cache',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (response.status !== 201) {
    return Promise.reject(
      new Error(`Could not store training: ${await response.text()}`),
    );
  }
  const data = await response.text();
  const training = JSON.parse(data, bigIntReviver) as TrainingDtoNew;

  return training;
}

export async function updateTraining(
  accessToken: string,
  id: string | number,
  date: string,
  disciplineId: number,
  group: string,
  compensationCents: number,
  participantCount: number,
): Promise<TrainingDtoNew> {
  const request: TrainingUpdateRequest = {
    date,
    disciplineId,
    group,
    compensationCents,
    participantCount,
  };
  const response = await fetch(`/api/trainings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.text();
  return JSON.parse(data, bigIntReviver) as TrainingDtoNew;
}

export async function deleteTraining(
  accessToken: string,
  id: number,
): Promise<void> {
  await fetch(`/api/trainings/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function approveTraining(
  accessToken: string,
  id: string,
): Promise<TrainingDtoNew> {
  const response = await fetch(`/api/trainings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'APPROVED' }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.text();
  return JSON.parse(data, bigIntReviver) as TrainingDtoNew;
}

export async function unapproveTraining(
  accessToken: string,
  id: string,
): Promise<TrainingDtoNew> {
  const response = await fetch(`/api/trainings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'NEW' }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.text();
  return JSON.parse(data, bigIntReviver) as TrainingDtoNew;
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
