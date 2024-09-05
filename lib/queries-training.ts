import {
  TrainingCreateRequest,
  TrainingDto,
  TrainingUpdateRequest,
} from '@/lib/dto';
import { useMutation } from '@tanstack/react-query';
import { createInApi, deleteFromApi, updateInApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import { replaceElementWithId } from '@/lib/sort-and-filter';
import { dateToHumanReadable } from '@/lib/formatters';

export function trainingDeleteQuery(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
) {
  return useMutation({
    mutationFn: (t: TrainingDto) => {
      return deleteFromApi<TrainingDto>(API_TRAININGS, t, accessToken ?? '');
    },
    onSuccess: (deleted: TrainingDto) => {
      const newTrainings = trainings.filter((t) => t.id !== deleted.id);
      setTrainings(newTrainings);
      showSuccess(`Training für ${deleted.course!.name} gelöscht`);
    },
    onError: (e) => {
      showError(`Fehler beim Löschen des Trainings`, e.message);
    },
  });
}

export function trainingUpdateQuery(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
) {
  return useMutation({
    mutationFn: (props: {
      data: TrainingUpdateRequest;
      trainingId: number;
    }) => {
      return updateInApi<TrainingDto>(
        API_TRAININGS,
        props.trainingId,
        props.data,
        accessToken,
      );
    },
    onSuccess: (data: TrainingDto) => {
      const newTrainings = replaceElementWithId(trainings, data);
      setTrainings(newTrainings);
      showSuccess(
        `Training ${data.course!.name} vom ${dateToHumanReadable(data.date)} aktualisiert`,
      );
    },
    onError: (e) => {
      showError(`Fehler beim Aktualisieren des Trainings`, e.message);
    },
  });
}

export function trainingCreateQuery(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
) {
  return useMutation({
    mutationFn: (data: TrainingCreateRequest) => {
      return createInApi<TrainingDto>(API_TRAININGS, data, accessToken);
    },
    onSuccess: (createdTraining: TrainingDto) => {
      const newTrainings = [...trainings, createdTraining];
      setTrainings(newTrainings);
      showSuccess(`Training für ${createdTraining.course!.name} erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Trainings`, e.message);
    },
  });
}
