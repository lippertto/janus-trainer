interface OneCompensation {
  user: { id: string; name: string; iban: string };
  totalCompensationCents: number;
  totalTrainings: number;
  correspondingIds: string[];
  periodStart: string;
  periodEnd: string;
}

export interface CompensationQueryResponse {
  value: OneCompensation[];
}
