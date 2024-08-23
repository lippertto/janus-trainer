import prisma from '@/lib/prisma';
import { ApiErrorConflict, ApiErrorNotFound } from '@/lib/helpers-for-api';
import { Training, TrainingStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function transitionStatus(id: number, status: TrainingStatus) {
  const currentTraining = await prisma.training.findFirst({
    where: { id },
  });
  console.log(">>>>", status);
  if (!currentTraining) {
    throw new ApiErrorNotFound(
      'Training not found. Cannot update training status.',
    );
  }

  if (currentTraining.status === TrainingStatus.COMPENSATED) {
    throw new ApiErrorConflict(
      'Compensated trainings cannot be changed',
      'CompensatedTrainingIsImmutable',
    );
  }

  // let data: {status: TrainingStatus, approvedAt?: Date, compensatedAt?: Date} = {
  let data: Pick<Training, "status"|"approvedAt"|"compensatedAt"> = {
    status,
    approvedAt: null,
    compensatedAt: null,
  };

  if (status === TrainingStatus.APPROVED) {
    data.approvedAt = new Date();
  } else if (status === TrainingStatus.COMPENSATED) {
    data.compensatedAt = new Date();
  }

  const result = await prisma.training.update({
    where: { id },
    data,
    include: { course: true, user: true },
  });

  return NextResponse.json(result);
}