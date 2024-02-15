import { TrainingDto, TrainingListDto } from 'janus-trainer-dto';

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
