import { Course, Training, UserInDb } from '@prisma/client';
import { TrainingDto } from '@/lib/dto';


export function trainingToDto(training: Training, user?: UserInDb, course?: Course): TrainingDto {
  return {
    ...training,
    user: user ? { id: user.id, name: user.name } :  undefined,
    course: course,
    approvedAt: training.approvedAt?.toISOString(),
    compensatedAt: training.compensatedAt?.toISOString(),
  }
}