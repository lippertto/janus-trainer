import { Course, Training, UserInDb } from '@prisma/client';
import { TrainingDto } from '@/lib/dto';

export function trainingToDto(
  training: Training & { user?: UserInDb; course?: Course },
): TrainingDto {
  return {
    ...training,
    user: training.user
      ? { id: training.user.id, name: training.user.name }
      : undefined,
    course: training.course,
    approvedAt: training.approvedAt?.toISOString(),
    compensatedAt: training.compensatedAt?.toISOString(),
  };
}
