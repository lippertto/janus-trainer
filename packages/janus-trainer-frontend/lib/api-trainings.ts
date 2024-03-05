import {
  TrainingCreateRequestDto,
  TrainingDto,
  TrainingListDto,
} from 'janus-trainer-dto';

export async function getTrainingsForUser(
  accessToken: string,
  userId: string,
): Promise<TrainingDto[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/trainings?userId=${userId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status !== 200) {
    return Promise.reject(new Error('Could not retrieve trainings'));
  }
  const body = (await response.json()) as TrainingListDto;

  return body.value;
}

export async function addTraining(
  accessToken: string,
  date: string,
  disciplineId: string,
  group: string,
  compensationCents: number,
  participantCount: number,
  userId: string,
): Promise<TrainingDto> {
  const request: TrainingCreateRequestDto = {
    date,
    disciplineId,
    group,
    compensationCents,
    participantCount,
    userId,
  };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/trainings?userId=${userId}`,
    {
      method: 'POST',
      body: JSON.stringify(request),
      cache: 'no-cache',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
  if (response.status !== 201) {
    return Promise.reject(
      new Error(`Could not store training: ${await response.text}`),
    );
  }
  return (await response.json()) as TrainingDto;
}
