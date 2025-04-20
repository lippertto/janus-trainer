import {
  ErrorDto,
  TrainingDto,
  TrainingUpdateRequest,
  TrainingUpdateStatusRequest,
} from '@/lib/dto';
import {
  allowAdminOrSelf,
  allowAnyLoggedIn,
  allowOnlyAdmins,
  ApiErrorNotFound,
  emptyResponse,
  forbiddenResponse,
  getOwnUserId,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  isAdmin,
  notFoundResponse,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { transitionStatus } from '@/app/api/trainings/[trainingId]/transitionStatus';
import { trainingToDto } from '@/app/api/trainings/trainingUtils';
import { logger } from '@/lib/logging';
import { sendEmail } from '@/lib/email';
import { User } from 'next-auth';
import { centsToHumanReadable } from '@/lib/formatters';

async function checkIfTrainingExistsAndIsOwn(
  id: number,
  nextRequest: NextRequest,
) {
  const training = await prisma.training.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!training) {
    throw new ApiErrorNotFound(`Training with id=${id} was not found`);
  }
  await allowAdminOrSelf(nextRequest, training.user.id);
}

function generateEmailSubject(courseName: string, date: string): string {
  return `JOTA: Training '${courseName}' vom ${date} gelöscht`;
}

function generateEmailBody(
  courseName: string,
  date: string,
  deleter: User,
  reason: string | null,
): string {
  let result = `Dein Training "${courseName}" vom ${date} wurde von ${deleter.name} gelöscht.\n`;
  if (reason && reason !== '') {
    result += `Die Begründung ist: ${reason}\n`;
  }
  result += `Bei Fragen schreibe bitte eine Email an ${deleter.email}.\n`;
  return result;
}

export async function DELETE(
  nextRequest: NextRequest,
  props: { params: Promise<{ trainingId: string }> },
) {
  const params = await props.params;
  try {
    await allowAnyLoggedIn(nextRequest);

    const trainingId = idAsNumberOrThrow(params.trainingId);
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { user: true, course: true },
    });
    if (!training) {
      return notFoundResponse();
    }

    const requestUserId = await getOwnUserId(nextRequest);
    const deletingSomeoneElsesTraining = requestUserId !== training.user.id;

    console.log({ requestUserId, tui: training.user.id });
    if (deletingSomeoneElsesTraining) {
      if (!(await isAdmin(nextRequest))) {
        return forbiddenResponse(
          "You must be admin to delete other people's training.",
        );
      }
    }

    logger.info(
      { userId: requestUserId, trainingId: training.id },
      `Deleting training ${trainingId}`,
    );
    await prisma.training.delete({ where: { id: trainingId } });

    if (deletingSomeoneElsesTraining) {
      const requester = await prisma.userInDb.findUniqueOrThrow({
        where: { id: requestUserId },
      });
      const reason = nextRequest.nextUrl.searchParams.get('reason');
      if (process.env.NODE_ENV === 'production') {
        await sendEmail(
          training.user.email!,
          generateEmailSubject(training.course.name, training.date),
          generateEmailBody(
            training.course.name,
            training.date,
            requester,
            reason,
          ),
        );
      } else {
        logger.info(
          `Will not send email for training deletion to ${training.user.email} because we are not on prod.`,
        );
      }
    }

    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function updateTraining(request: TrainingUpdateRequest, id: number) {
  return prisma.training.update({
    where: { id: id },
    data: {
      date: request.date,
      courseId: request.courseId,
      compensationCents: request.compensationCents,
      participantCount: request.participantCount,
      comment: request.comment,
    },
    include: { course: true, user: true },
  });
}

function generateUpdateEmailSubject(courseName: string, date: string) {
  return `JOTA: Training "${courseName}" vom ${date} wurde aktualisiert`;
}

function generateUpdateEmailBody(
  courseName: string,
  date: string,
  deleter: User,
  reason: string | null,
  oldCents: number,
  newCents: number,
) {
  let result = `Die Vergütung deines Trainings "${courseName}" vom ${date} wurde von ${deleter.name} angepasst.
Du hattest ${centsToHumanReadable(oldCents)} eingetragen. Der neue Wert ist ${centsToHumanReadable(newCents)}.
`;
  if (reason) {
    result += `Die Begründung ist: ${reason}\n`;
  }
  result += `Bei Fragen schreibe bitte eine Email an ${deleter.email}.\n`;
  return result;
}

export async function PUT(
  nextRequest: NextRequest,
  props: { params: Promise<{ trainingId: string }> },
): Promise<NextResponse<TrainingDto | ErrorDto>> {
  const params = await props.params;
  try {
    // first test that we are logged in. Further down, we do more checks
    await allowAnyLoggedIn(nextRequest);
    const id = idAsNumberOrThrow(params.trainingId);
    const ownUserId = await getOwnUserId(nextRequest);

    const training = await prisma.training.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!training) {
      return notFoundResponse();
    }

    if (!(await isAdmin(nextRequest)) && training.userId !== ownUserId) {
      return forbiddenResponse("Must be admin to update others' trainings.");
    }

    const request = await validateOrThrow(
      TrainingUpdateRequest,
      await nextRequest.json(),
    );

    const result = await updateTraining(request, id);
    logger.info(
      { userId: ownUserId, trainingId: id },
      `User ${ownUserId} updated training ${id}`,
    );

    const reason = nextRequest.nextUrl.searchParams.get('reason');
    if (reason && reason !== '') {
      const trainingUser = await prisma.userInDb.findUniqueOrThrow({
        where: { id: training.userId },
      });
      const requestingUser = await prisma.userInDb.findUniqueOrThrow({
        where: { id: ownUserId },
      });
      if (process.env.NODE_ENV === 'production') {
        await sendEmail(
          trainingUser.email!,
          generateUpdateEmailSubject(training.course.name, training.date),
          generateUpdateEmailBody(
            training.course.name,
            training.date,
            requestingUser,
            reason,
            training.compensationCents,
            request.compensationCents,
          ),
        );
      } else {
        logger.info(
          `Will not send email for training update to ${trainingUser.email} because we are not on prod.`,
        );
      }
    }

    return NextResponse.json(trainingToDto(result));
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function PATCH(
  nextRequest: NextRequest,
  props: { params: Promise<{ trainingId: string }> },
): Promise<NextResponse<TrainingDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    const userId = await getOwnUserId(nextRequest);
    const id = idAsNumberOrThrow(params.trainingId);
    const request = await validateOrThrow(
      TrainingUpdateStatusRequest,
      await nextRequest.json(),
    );
    const result = await transitionStatus(id, request.status);
    logger.info(
      { userId, trainingId: id },
      `User ${userId} changed status of training ${id} to ${result.status}`,
    );
    return NextResponse.json(trainingToDto(result));
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function returnOneTraining(
  request: NextRequest,
  idAsString: string,
): Promise<TrainingDto> {
  const id = idAsNumberOrThrow(idAsString);
  await checkIfTrainingExistsAndIsOwn(id, request);

  const training = await prisma.training.findFirst({
    where: { id },
    include: {
      user: true,
      course: true,
    },
  });
  if (!training) {
    throw new ApiErrorNotFound('Training not found.');
  }

  return trainingToDto(training);
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ trainingId: string }> },
): Promise<NextResponse<TrainingDto | ErrorDto>> {
  const params = await props.params;
  try {
    // first test that we are logged in. Further down, we do more checks
    await allowAnyLoggedIn(request);
    return NextResponse.json(
      await returnOneTraining(request, params.trainingId),
    );
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
