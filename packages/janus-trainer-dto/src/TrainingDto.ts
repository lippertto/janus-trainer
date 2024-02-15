export type TrainingDto = {
  id: string;
  status: TrainingStatusDto;
  date: string;
  discipline: { name: string; id: string };
  group: string;
  compensationCents: number;
  participantCount: number;

  userId: string;
  userName: string;

  // deprecated
  user: { id: string; name: string };
};

export type TrainingListDto = {
  value: TrainingDto[];
};

export enum TrainingStatusDto {
  NEW = 'NEW',
  APPROVED = 'APPROVED',
  COMPENSATED = 'COMPENSATED',
}
