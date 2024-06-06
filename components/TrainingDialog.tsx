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
import { CompensationValueLightDto, CourseDto, DisciplineDto, TrainingCreateRequest, TrainingDto } from '@/lib/dto';
import Autocomplete from '@mui/material/Autocomplete';

type CoursesDropdown = {
  courses: CourseDto[],
  selectedCourse: CourseDto | null,
  setSelectedCourse: (c: CourseDto | null) => void,
  setSelectedCompensationValue: (cv: CompensationValueLightDto | null) => void
}

function CoursesDropdown({
                           courses,
                           selectedCourse,
                           setSelectedCourse,
                           setSelectedCompensationValue,
                         }: CoursesDropdown) {
  return <Autocomplete
    options={courses}
    getOptionLabel={(c) => (c.name)}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Kurs"
      />
    )}
    value={selectedCourse}
    onChange={(_, value) => {
      setSelectedCourse(value);
      if (value === null) {
        setSelectedCompensationValue(null);
      }
    }}
  />;
}

type CompensationValueDropdownProps = {
  compensations: CompensationValueLightDto[]
  selectedCompensationValue: CompensationValueLightDto | null;
  setSelectedCompensationValue: (v: CompensationValueLightDto | null) => void;
}

function CompensationValueDropdown({
                                     compensations,
                                     selectedCompensationValue,
                                     setSelectedCompensationValue,
                                   }: CompensationValueDropdownProps) {
  const compensationsAreEmpty = compensations.length === 0;
  const onlyOneCompensation = compensations.length === 1;
  if (onlyOneCompensation) {
    setSelectedCompensationValue(compensations[0])
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
  trainingToEdit: TrainingDto | null;
  courses: CourseDto[]
};

function compensationValueToText(cv: CompensationValueLightDto) {
  const value = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cv.cents / 100);
  return `${cv.description} (${value})`;
}

export default function TrainingDialog({
                                         open,
                                         courses,
                                         userId,
                                         handleClose,
                                         handleConfirm,
                                         trainingToEdit,
                                       }: TrainingDialogProps) {
  const [date, setDate] = React.useState<dayjs.Dayjs | null>(dayjs());
  const [participantCount, setParticipantCount] = React.useState<number>(0);
  const [selectedCompoensationValue, setSelectedCompoensationValue] = React.useState<CompensationValueLightDto | null>(null);
  const [selectedCourse, setSelectedCourse] = React.useState<CourseDto | null>(null);
  const [previousTraining, setPreviousTraining] = React.useState<TrainingDto | null>();

  if (trainingToEdit !== previousTraining) {
    setPreviousTraining(trainingToEdit);
    if (trainingToEdit) {
      setSelectedCourse(courses.find((c) => (c.id === trainingToEdit.course.id)) ?? null);
      setDate(dayjs(trainingToEdit.date));
      setParticipantCount(Number(trainingToEdit.participantCount));
      setSelectedCompoensationValue(null);
    } else {
      setSelectedCourse(null);
      setDate(dayjs());
      setParticipantCount(0);
      setSelectedCompoensationValue(null);
    }
  }

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
      <DialogTitle>{trainingToEdit? "Training bearbeiten" : "Training hinzufügen"}</DialogTitle>
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
            setSelectedCompensationValue={setSelectedCompoensationValue}
          />

          <CompensationValueDropdown
            compensations={selectedCourse ? selectedCourse.allowedCompensations : []}
            selectedCompensationValue={selectedCompoensationValue}
            setSelectedCompensationValue={setSelectedCompoensationValue}
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
              disciplineId: selectedCourse!.disciplineId,
              courseId: selectedCourse!.id,
              compensationCents: selectedCompoensationValue!.cents,
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
