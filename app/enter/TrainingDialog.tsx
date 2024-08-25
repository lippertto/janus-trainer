import React from 'react';

import Button from '@mui/material/Button';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { DatePicker } from '@mui/x-date-pickers';

import dayjs from 'dayjs';
import {
  CompensationValueDto,
  CourseDto,
  dayOfWeekToHumanReadable,
  TrainingCreateRequest,
  TrainingDto,
} from '@/lib/dto';
import Autocomplete from '@mui/material/Autocomplete';
import { centsToHumanReadable, dateToHumanReadable } from '@/lib/formatters';
import { useConfirm } from 'material-ui-confirm';

type CoursesDropdown = {
  courses: CourseDto[],
  selectedCourse: CourseDto | null,
  setSelectedCourse: (c: CourseDto | null) => void,
  error: string,
}

function courseDisplayname(c: CourseDto): string {
  const prefix = c.weekdays.map((wd) => dayOfWeekToHumanReadable(wd, true)).join(',');
  return `(${prefix}): ${c.name}`;
}

function CoursesDropdown(
  {
    courses,
    selectedCourse,
    setSelectedCourse,
    error,
  }: CoursesDropdown) {
  const onlyOneCourse = courses.length === 1;
  const coursesAreEmpty = courses.length === 0;

  return <Autocomplete
    disabled={onlyOneCourse || coursesAreEmpty}
    options={courses}
    getOptionLabel={courseDisplayname}
    renderInput={(params) => (
      <TextField
        {...params}
        label={coursesAreEmpty ? 'Keine Kurse hinterlegt' : 'Kurs'}
        error={error !== ' '}
        helperText={error}
        inputProps={{ ...params.inputProps, 'data-testid': 'courses-dropdown-input' }}
      />
    )}
    value={selectedCourse}
    onChange={(_, value) => {
      setSelectedCourse(value);
    }}
  />;
}

type CompensationValueDropdownProps = {
  compensations: CompensationValueDto[]
  selectedCompensationValue: CompensationValueDto | null;
  setSelectedCompensationValue: (v: CompensationValueDto | null) => void;
  error: string;
}

function CompensationValueDropdown(
  {
    compensations,
    selectedCompensationValue,
    setSelectedCompensationValue,
    error,
  }: CompensationValueDropdownProps) {
  const compensationsAreEmpty = compensations.length === 0;
  const onlyOneCompensation = compensations.length === 1;

  return <Autocomplete
    disabled={compensationsAreEmpty || onlyOneCompensation}
    options={compensations}
    getOptionLabel={(cv) => (compensationValueToText(cv))}
    renderInput={(params) => (
      <TextField
        {...params}
        label={compensationsAreEmpty ? 'Erst Kurs auswählen' : 'Pauschale'}
        error={error !== ' '}
        helperText={error}
        inputProps={{ ...params.inputProps, 'data-testid': 'compensation-value-dropdown-input' }}
      />
    )}
    value={selectedCompensationValue}
    onChange={(_, value) => {
      setSelectedCompensationValue(value);
    }}
  />;
}


type TrainingDialogProps = {
  open: boolean;
  userId: string;
  handleClose: () => void;
  handleSave: (data: TrainingCreateRequest) => void;
  handleDelete?: (v: TrainingDto) => void;
  toEdit: TrainingDto | null;
  courses: CourseDto[],
  compensationValues: CompensationValueDto[],
};

function compensationValueToText(cv: CompensationValueDto) {
  return `${cv.description} (${(centsToHumanReadable(cv.cents))})`;
}

export function selectCompensationValue(course: Pick<CompensationValueDto, 'durationMinutes'> | null, compensationValues: CompensationValueDto[]) {
  if (!course) return null;
  if (compensationValues.length === 0) {
    return null;
  }
  const cvWithMatchingTime = compensationValues.find((cv) => (cv.durationMinutes === course.durationMinutes));
  if (cvWithMatchingTime) {
    return cvWithMatchingTime;
  }
  return compensationValues[0];
}

export default function TrainingDialog(
  {
    open,
    courses,
    userId,
    handleClose,
    handleSave,
    handleDelete,
    toEdit,
    compensationValues,
  }: TrainingDialogProps) {
  const [date, setDate] = React.useState<dayjs.Dayjs | null>(dayjs());
  const [participantCount, setParticipantCount] = React.useState<string>('0');
  const [selectedCourse, setSelectedCourse] = React.useState<CourseDto | null>((courses && courses.length > 0) ? courses[0] : null);
  const [selectedCompensationValue, setSelectedCompensationValue] = React.useState<CompensationValueDto | null>(selectCompensationValue(selectedCourse, compensationValues));
  const [previousTraining, setPreviousTraining] = React.useState<TrainingDto | null>(null);
  const [comment, setComment] = React.useState<string>('');

  const resetFields = React.useCallback(() => {
    if (courses.length > 0) {
      setSelectedCourse(courses[0]);
    } else {
      setSelectedCourse(null);
    }
    setDate(dayjs());
    setParticipantCount('0');
    setComment('');
  }, [courses, setSelectedCourse, setDate, setParticipantCount]);

  if (toEdit !== previousTraining) {
    setPreviousTraining(toEdit);
    if (toEdit) {
      setSelectedCourse(courses.find((c) => (c.id === toEdit.course?.id)) ?? null);
      setDate(dayjs(toEdit.date));
      setParticipantCount(toEdit.participantCount.toString());
      setSelectedCompensationValue(compensationValues.find((cv) => (cv.cents === toEdit?.compensationCents)) ?? null);
      setComment(toEdit.comment);
    } else {
      resetFields();
    }
  }

  React.useEffect(() => {
    if (selectedCourse) {
      setSelectedCompensationValue(selectCompensationValue(selectedCourse, compensationValues));
    }
  }, [selectedCourse]);

  const participantCountError = parseInt(participantCount) > 0 ? ' ' : 'Muss gesetzt sein';
  const dateError = date ? ' ' : 'Muss gesetzt sein';
  const compensationError = selectedCompensationValue ? ' ' : 'Muss gesetzt sein';
  const coursesError = selectedCourse ? ' ' : 'Muss gesetzt sein';

  const thereIsAnError =
    dateError !== ' ' || participantCountError !== ' ' || compensationError !== ' ' || coursesError !== ' ';

  const confirm = useConfirm();
  const handleDeleteClick = (training: TrainingDto) => {
    confirm({
      title: 'Training löschen?',
      description: `Soll das Training "${training.course?.name}" vom ${dateToHumanReadable(training.date)} gelöscht werden?`,
    })
      .then(
        () => {
          handleDelete!(training);
          handleClose();
        },
      ).catch(() => {
    });
  };

  return (
    <Dialog open={open}>
      <DialogTitle>{toEdit ? 'Training bearbeiten' : 'Training hinzufügen'}</DialogTitle>
      <DialogContent>
        {/* padding is required in <Stack/> so that the label is shown */}
        <Stack sx={{ pt: 1 }}>
          <DatePicker
            label="Datum"
            maxDate={dayjs()}
            value={date}
            onChange={(e) => setDate(e)}
            slotProps={{
              textField: {
                error: dateError !== ' ',
                helperText: dateError,
                inputProps: { 'data-testid': 'add-training-date-field' },
              },
            }}
          />

          <CoursesDropdown
            courses={courses}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            error={coursesError}
          />

          <CompensationValueDropdown
            compensations={compensationValues}
            selectedCompensationValue={selectedCompensationValue}
            setSelectedCompensationValue={setSelectedCompensationValue}
            error={compensationError}
          />

          <TextField
            type="number"
            label="Anzahl Personen"
            value={participantCount}
            onChange={(e) => setParticipantCount(
              e.target.value,
            )
            }
            inputProps={{
              min: 1, 'data-testid': 'add-training-participant-count-field',
            }}
            error={participantCountError !== ' '}
            helperText={participantCountError}
          />
        </Stack>

        <TextField
          value={comment}
          label={'Kommentar'}
          helperText={'Zum Beispiel bei Vertretungen'}
          onChange={(e) => {
            setComment(e.target.value);
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={
            () => {
              handleClose();
              setTimeout(resetFields, 300);
            }}>Abbrechen</Button>
        {
          handleDelete ?
            <Button
              data-testid="add-training-delete-button"
              onClick={() => handleDeleteClick(toEdit!)} color={'error'}>löschen</Button>
            : null
        }
        <Button
          disabled={thereIsAnError}
          data-testid="add-training-save-button"
          onClick={() => {
            handleSave({
              date: date!.format('YYYY-MM-DD'),
              courseId: selectedCourse!.id,
              compensationCents: selectedCompensationValue!.cents,
              participantCount: parseInt(participantCount),
              comment: comment ?? '',
              userId,
            });
            handleClose();
            setTimeout(resetFields, 300);
          }}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
