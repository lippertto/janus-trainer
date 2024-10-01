import React from 'react';
import {
  CompensationValueDto,
  CourseDto,
  TrainingCreateRequest,
  TrainingDto,
} from '@/lib/dto';
import { DayOfWeek } from '@prisma/client';
import { dateToHumanReadable } from '@/lib/formatters';
import { useConfirm } from 'material-ui-confirm';
import { TrainingDialogContentForCourse } from '@/app/enter/TrainingDialogContentForCourse';
import { TrainingDialogContentForCustom } from '@/app/enter/TrainingDialogContentForCustom';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';

export default function TrainingDialog(props: {
  open: boolean;
  toEdit: TrainingDto | null;
  userId: string;
  courses: CourseDto[];
  compensationValues: CompensationValueDto[];
  today: DayOfWeek;
  handleClose: () => void;
  handleSave: (v: TrainingCreateRequest) => void;
  handleDelete: (v: TrainingDto) => void;
  getCustomCourses: () => CourseDto[];
}) {
  const [previous, setPrevious] = React.useState<TrainingDto | null>(null);
  const [type, setType] = React.useState<'training' | 'custom'>('training');

  if (props.toEdit !== previous) {
    setPrevious(props.toEdit);
    setType(props.toEdit?.course?.isCustomCourse ? 'custom' : 'training');
  }

  const confirm = useConfirm();
  const handleDeleteClick = () => {
    confirm({
      title: 'Training löschen?',
      description: `Soll das Training "${props.toEdit?.course?.name}" vom ${dateToHumanReadable(props.toEdit?.date!)} gelöscht werden?`,
    })
      .then(() => {
        props.handleDelete(props.toEdit!);
        props.handleClose();
      })
      .catch(() => {});
  };

  return (
    <Dialog
      open={props.open}
      onClose={() => {
        props.handleClose();
      }}
    >
      <DialogTitle>
        {props.toEdit ? 'Vergütung bearbeiten' : 'Vergütung beantragen'}
      </DialogTitle>

      {type === 'training' ? (
        <TrainingDialogContentForCourse
          handleClose={props.handleClose}
          handleDelete={handleDeleteClick}
          handleSave={props.handleSave}
          setType={setType}
          type={type}
          userId={props.userId}
          courses={props.courses}
          toEdit={props.toEdit}
          today={props.today}
          compensationValues={props.compensationValues}
        />
      ) : (
        <TrainingDialogContentForCustom
          open={props.open}
          handleClose={props.handleClose}
          handleDelete={handleDeleteClick}
          handleSave={props.handleSave}
          toEdit={props.toEdit}
          setType={setType}
          type={type}
          getCourses={props.getCustomCourses}
          userId={props.userId}
        />
      )}
    </Dialog>
  );
}
