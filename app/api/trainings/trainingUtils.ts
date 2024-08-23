import { Course, Training, UserInDb } from '@prisma/client';
import { TrainingDto } from '@/lib/dto';


export function trainingToDto(training: Training, user: UserInDb, course: Course): TrainingDto {
  return {
    ...training,
    user: { id: user.id, name: user.name },
    course: course,
    approvedAt: training.approvedAt?.toISOString(),
    compensatedAt: training.compensatedAt?.toISOString(),
  }
}