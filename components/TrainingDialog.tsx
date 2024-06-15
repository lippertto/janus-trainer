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
  TrainingCreateRequest,
  TrainingDto,
} from '@/lib/dto';
import Autocomplete from '@mui/material/Autocomplete';
import { centsToDisplayString, compensationGroupToHumanReadable } from '@/lib/formatters';

type CoursesDropdown = {
  courses: CourseDto[],
  selectedCourse: CourseDto | null,
  setSelectedCourse: (c: CourseDto | null) => void,
}

function CoursesDropdown({
                           courses,
                           selectedCourse,
                           setSelectedCourse,
                         }: CoursesDropdown) {
  const onlyOneCourse = courses.length === 1;
  const coursesAreEmpty = courses.length === 0;

  return <Autocomplete
    disabled={onlyOneCourse || coursesAreEmpty}
    options={courses}
    getOptionLabel={(c) => (c.name)}
    renderInput={(params) => (
      <TextField
        {...params}
        label={coursesAreEmpty ? 'Keine Kurse hinterlegt' : 'Kurs'}
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
}

function CompensationValueDropdown({
                                     compensations,
                                     selectedCompensationValue,
                                     setSelectedCompensationValue,
                                   }: CompensationValueDropdownProps) {
  const compensationsAreEmpty = compensations.length === 0;
  const onlyOneCompensation = compensations.length === 1;
  if (onlyOneCompensation) {
    setSelectedCompensationValue(compensations[0]);
  }
  return <Autocomplete
    disabled={compensationsAreEmpty || onlyOneCompensation}
    options={compensations}
    getOptionLabel={(cv) => (compensationValueToText(cv))}
    renderInput={(params) => (
      <TextField
        {...params}
        label={compensationsAreEmpty ? 'Erst Kurs auswählen' : 'Vergütung'}
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
  handleConfirm: (data: TrainingCreateRequest) => void;
  toEdit: TrainingDto | null;
  courses: CourseDto[],
  compensationValues: CompensationValueDto[],
};

function compensationValueToText(cv: CompensationValueDto) {
  const value = centsToDisplayString(cv.cents);
  return `${compensationGroupToHumanReadable(cv.compensationGroup)}: ${cv.description} (${value})`;
}

export default function TrainingDialog(
  {
    open,
    courses,
    userId,
    handleClose,
    handleConfirm,
    toEdit,
    compensationValues,
  }: TrainingDialogProps) {
  const [date, setDate] = React.useState<dayjs.Dayjs | null>(dayjs());
  const [participantCount, setParticipantCount] = React.useState<number>(0);
  const [selectedCompensationValue, setSelectedCompensationValue] = React.useState<CompensationValueDto | null>(null);
  const [selectedCourse, setSelectedCourse] = React.useState<CourseDto | null>(null);
  const [previousTraining, setPreviousTraining] = React.useState<TrainingDto | null>();

  if (toEdit !== previousTraining) {
    setPreviousTraining(toEdit);
    if (toEdit) {
      setSelectedCourse(courses.find((c) => (c.id === toEdit.course.id)) ?? null);
      setDate(dayjs(toEdit.date));
      setParticipantCount(Number(toEdit.participantCount));
      setSelectedCompensationValue(compensationValues.find((cv)=> (cv.cents === toEdit.compensationCents)) ?? null);
    } else {
      if (courses.length > 0) {
        setSelectedCourse(courses[0]);
      } else {
        setSelectedCourse(null)
      }
      setDate(dayjs());
      setParticipantCount(0);
    }
  }

  React.useEffect(() => {
    if (selectedCourse) {
      setSelectedCompensationValue(compensationValues.find((cv)=> (cv.durationMinutes === selectedCourse.durationMinutes))?? null);
    }
  }, [selectedCourse])

  let participantCountError = ' ';
  if (participantCount === 0) {
    participantCountError = 'Muss gesetzt sein';
  }

  let dateError = null;
  if (!date) {
    dateError = 'Muss gesetzt sein';
  }

  const thereIsAnError =
    Boolean(dateError) || participantCountError !== ' ';


  return (
    <Dialog open={open}>
      <DialogTitle>{toEdit ? 'Training bearbeiten' : 'Training hinzufügen'}</DialogTitle>
      <DialogContent>
        {/* padding is required in <Stack/> so that the label is shown */}
        <Stack spacing={2} padding={1}>
          <DatePicker
            label="Datum"
            maxDate={dayjs()}
            value={date}
            onChange={(e) => setDate(e)}
            slotProps={{
              textField: {
                error: Boolean(dateError),
                helperText: dateError,
                inputProps: { 'data-testid': 'add-training-date-field' },
              },
            }}
          />

          <CoursesDropdown
            courses={courses}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
          />

          <CompensationValueDropdown
            compensations={compensationValues}
            selectedCompensationValue={selectedCompensationValue}
            setSelectedCompensationValue={setSelectedCompensationValue}
          />

          <TextField
            type="number"
            label="Anzahl Teilnehmer"
            data-testid="add-training-participant-count-field"
            value={participantCount}
            onChange={(e) => setParticipantCount(parseInt(e.target.value))}
            inputProps={{ min: 1 }}
            error={participantCountError !== ' '}
            helperText={participantCountError}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Abbrechen</Button>
        <Button
          disabled={thereIsAnError}
          data-testid="add-training-save-button"
          onClick={() => {
            handleConfirm({
              date: date!.format('YYYY-MM-DD'),
              courseId: selectedCourse!.id,
              compensationCents: selectedCompensationValue!.cents,
              participantCount,
              userId,
            });
            handleClose();
          }}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
