export class TrainingResponse {
  id: string;
  // is of type GivenTrainingStatus
  status: string;
  date: string;
  discipline: { name: string; id: string };
  group: string;
  compensationCents: number;
  participantCount: number;

  userId: string;
  userName: string;

  // deprecated
  user: { id: string; name: string };
}
