import React from 'react';
import { DayOfWeek } from '@prisma/client';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { Autocomplete, Chip, FormControl } from '@mui/material';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import { TimePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { CompensationValueDto, CompensationValueLightDto, CourseCreateRequest, CourseDto, User } from '@/lib/dto';

type CourseDialogProps = {
  open: boolean;
  handleClose: () => void;
  handleSave: (data: Omit<CourseCreateRequest, 'disciplineId'>) => void;
  trainers: User[];
  compensationValues: CompensationValueDto[];
  courseToEdit: CourseDto | null;
};

type WeekdaySelection = {
  mon: boolean,
  tue: boolean,
  wed: boolean,
  thu: boolean,
  fri: boolean,
  sat: boolean,
  sun: boolean,
}

function weekdaySelectionToEnum(v: WeekdaySelection): DayOfWeek[] {
  let result: DayOfWeek[] = [];
  if (v.mon) result.push(DayOfWeek.MONDAY);
  if (v.tue) result.push(DayOfWeek.TUESDAY);
  if (v.wed) result.push(DayOfWeek.WEDNESDAY);
  if (v.thu) result.push(DayOfWeek.THURSDAY);
  if (v.fri) result.push(DayOfWeek.FRIDAY);
  if (v.sat) result.push(DayOfWeek.SATURDAY);
  if (v.sun) result.push(DayOfWeek.SUNDAY);
  return result;
}

function enumToWeekdaySelection(values: DayOfWeek[]) {
  let result = { ...EMPTY_DAYS };
  for (const v of values) {
    switch (v) {
      case 'MONDAY':
        result.mon = true;
        break;
      case 'TUESDAY':
        result.tue = true;
        break;
      case 'WEDNESDAY':
        result.wed = true;
        break;
      case 'THURSDAY':
        result.thu = true;
        break;
      case 'FRIDAY':
        result.fri = true;
        break;
      case 'SATURDAY':
        result.sat = true;
        break;
      case 'SUNDAY':
        result.sun = true;
        break;
    }
  }

  return result;
}

const EMPTY_DAYS: WeekdaySelection = {
  mon: false,
  tue: false,
  wed: false,
  thu: false,
  fri: false,
  sat: false,
  sun: false,
};

const DEFAULT_TIME = '2024-06-03 00:00';

type CompensationDropdownProps = {
  compensationValues: CompensationValueDto[],
  selectedCompensationValues: CompensationValueLightDto[],
  setSelectedCompensationValues: (v: CompensationValueLightDto[]) => void,
}

/*
 * Complicated autocomplete setup. We need to render tags and options ourselves or else we get spammed with error messages
 * https://stackoverflow.com/a/75968316/213636
 */
function CompensationDropdown({
                                compensationValues,
                                selectedCompensationValues,
                                setSelectedCompensationValues,
                              }: CompensationDropdownProps) {
  return <React.Fragment>
    <Autocomplete
      options={compensationValues}
      defaultValue={[]}
      multiple={true}
      renderTags={(tagValue, getTagProps) => {
        return tagValue.map((option, index) => (
          <Chip label={option.description} key={option.id} onDelete={() => {
            setSelectedCompensationValues(selectedCompensationValues.filter((cv) => (cv.id != option.id)))
          }}/>
        ));
      }}
      renderOption={(props, option) => {
        return (
          <li {...props} key={option.id}>
            {option.description}
          </li>
        );
      }}
      getOptionLabel={(cv) => (cv.description)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Vergütung"
        />
      )}
      value={selectedCompensationValues}
      onChange={(_, value) => {
        setSelectedCompensationValues(value);
      }}
    />
  </React.Fragment>;
}

type TrainerLight = Pick<User, 'name' | 'id'>

type TrainerDropdownProps = {
  trainers: User[],
  selectedTrainers: TrainerLight[],
  setSelectedTrainers: (v: TrainerLight[]) => void,
}

function TrainerDropdown({ trainers, selectedTrainers, setSelectedTrainers }: TrainerDropdownProps) {
  return <React.Fragment>
    <Autocomplete
      options={trainers}
      defaultValue={[]}
      multiple={true}
      renderTags={(tagValue, getTagProps) => {
        return tagValue.map((option, index) => (
          <Chip
            label={option.name} key={option.id}
                onDelete={() => {
                  setSelectedTrainers(selectedTrainers.filter((t) => (t.id !== option.id)))
                }}
          />
        ));
      }}
      renderOption={(props, option) => {
        return (
          <li {...props} key={option.id}>
            {option.name}
          </li>
        );
      }}
      getOptionLabel={(t) => (t.name)}
      renderInput={(params) => <TextField {...params} label="Trainer" />}
      value={selectedTrainers}
      onChange={(_, value) => {
        setSelectedTrainers(value);
      }}
    />

  </React.Fragment>;
}

export function CourseDialog(
  {
    open,
    handleClose,
    handleSave,
    trainers,
    compensationValues,
    courseToEdit,
  }: CourseDialogProps) {
  const [courseName, setCourseName] = React.useState('');
  const [days, setDays] = React.useState<WeekdaySelection>(EMPTY_DAYS);
  const [time, setTime] = React.useState<Dayjs | null>(dayjs(DEFAULT_TIME));
  const [duration, setDuration] = React.useState<string>('60');
  const [selectedTrainers, setSelectedTrainers] = React.useState<{ name: string, id: string }[]>([]);
  const [selectedCompensationValues, setSelectedCompensationValues] = React.useState<CompensationValueLightDto[]>([]);
  const [previousCourse, setPreviousCourse] = React.useState<CourseDto | null>(null);
  if (previousCourse !== courseToEdit) {
    setPreviousCourse(courseToEdit);
    if (courseToEdit) {
      setCourseName(courseToEdit.name);
      setTime(dayjs(`2024-06-03 ${courseToEdit.startHour}:${courseToEdit.startMinute}`));
      setDuration(courseToEdit.durationMinutes.toString());
      setSelectedTrainers(courseToEdit.trainers);
      setSelectedCompensationValues(courseToEdit.allowedCompensations ?? []);
      setDays(enumToWeekdaySelection(courseToEdit.weekdays));
    } else {
      setCourseName('');
      setTime(dayjs(DEFAULT_TIME));
      setDuration('60');
      setSelectedTrainers([]);
      setSelectedCompensationValues([]);
      setDays(EMPTY_DAYS);
    }
  }

  let errorMessage = ' ';
  if (courseName.length === 0) {
    errorMessage = 'Darf nicht leer sein';
  }

  const handleDayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDays({
      ...days,
      [event.target.name]: event.target.checked,
    });
  };

  return (
    <Dialog open={open}>
      <DialogTitle>{courseToEdit ? 'Kurs bearbeiten' : 'Kurs hinzufügen'}</DialogTitle>

      <DialogContent>
        <Stack direction={'row'} spacing={2}>
          <Stack spacing={2}>
            <TextField
              label="Name des Kurses"
              value={courseName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                console.log(`CHANGE! ${event.target.value}`)
                setCourseName(event.target.value);
              }}
              // needs to be set in Dialogs according to https://github.com/mui/material-ui/issues/29892#issuecomment-979745849
              margin="dense"
              inputProps={{
                'data-testid': 'enter-course-textfield',
              }}
              error={errorMessage !== ' '}
              helperText={errorMessage}
            />

            <TimePicker
              label="Uhrzeit"
              value={time}
              onChange={(v) => setTime(v)}
            />

            <TextField
              value={duration}
              onChange={((v) => setDuration(v.target.value))}
              label={'Dauer'}
              type={'number'}
              inputProps={{ step: 15, min: 15 }}
            />

            <CompensationDropdown
              compensationValues={compensationValues}
              selectedCompensationValues={selectedCompensationValues}
              setSelectedCompensationValues={setSelectedCompensationValues} />


            <TrainerDropdown
              trainers={trainers}
              selectedTrainers={selectedTrainers}
              setSelectedTrainers={setSelectedTrainers}
            />

          </Stack>
          <Stack>
            <FormControl component={'fieldset'}>
              <FormLabel>Wochentage</FormLabel>
              <FormControlLabel control={<Checkbox checked={days.mon} onChange={handleDayChange} name={'mon'} />}
                                label={'Montag'} />
              <FormControlLabel control={<Checkbox checked={days.tue} onChange={handleDayChange} name={'tue'} />}
                                label={'Dienstag'} />
              <FormControlLabel control={<Checkbox checked={days.wed} onChange={handleDayChange} name={'wed'} />}
                                label={'Mittwoch'} />
              <FormControlLabel control={<Checkbox checked={days.thu} onChange={handleDayChange} name={'thu'} />}
                                label={'Donnerstag'} />
              <FormControlLabel control={<Checkbox checked={days.fri} onChange={handleDayChange} name={'fri'} />}
                                label={'Freitag'} />
              <FormControlLabel control={<Checkbox checked={days.sat} onChange={handleDayChange} name={'sat'} />}
                                label={'Samstag'} />
              <FormControlLabel control={<Checkbox checked={days.sun} onChange={handleDayChange} name={'sun'} />}
                                label={'Sonntag'} />
            </FormControl>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => {
          handleClose();
        }}>Abbrechen</Button>
        <Button
          disabled={errorMessage !== ' '}
          onClick={() => {
            handleClose();
            handleSave(
              {
                name: courseName,
                durationMinutes: parseInt(duration),
                startHour: time!.hour(),
                startMinute: time!.minute(),
                weekdays: weekdaySelectionToEnum(days),
                trainerIds: selectedTrainers.map((t) => (t.id)),
                // allowedCompensationIds: selectedCompensationValues.map((cv) => (cv.id)),
                allowedCompensationIds: selectedCompensationValues.map((cv) => (cv.id)),
              },
            );
          }}
          data-testid="enter-discipline-confirm-button"
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
