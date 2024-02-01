export interface TrainerListEntry {
  userId: string;
  userName: string;
  newCount: number;
  approvedCount: number;
  compensatedCount: number;
}

export interface TrainerQueryResponse {
  value: TrainerListEntry[];
}
