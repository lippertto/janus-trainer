import { CourseDto, TrainingCreateRequest, UserDto } from '@/lib/dto';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { Controller, useForm } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import React, { Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Autocomplete from '@mui/material/Autocomplete';
import { compareNamed } from '@/lib/sort-and-filter';
import TextField from '@mui/material/TextField';
import Stack from '@mui/system/Stack';
import InputAdornment from '@mui/material/InputAdornment';

type MyCourse = Pick<CourseDto, 'id' | 'name'>;
type MyTrainer = Pick<UserDto, 'id' | 'name'>;

type FormData = {
  date: dayjs.Dayjs;
  trainer: MyTrainer | null;
  course: MyCourse | null;
  participantCount: number | string;
  comment: string;
  compensation: string;
};

export function EnterTrainingDialogForAdmins(props: {
  open: boolean;
  getTrainers: () => MyTrainer[];
  getCourses: (trainerId: string | null) => MyCourse[];
  handleConfirm: (v: TrainingCreateRequest) => void;
  handleClose: () => void;
}) {
  const defaultValues = {
    date: dayjs(),
    trainer: null,
    course: null,
    participantCount: '',
    comment: '',
    compensation: '',
  };
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    defaultValues,
  });

  function onSubmit(data: FormData) {
    if (!isValid) return;
    props.handleConfirm({
      date: data.date.format('YYYY-MM-DD'),
      userId: data.trainer!.id,
      courseId: data.course!.id,
      participantCount:
        typeof data.participantCount === 'number' ? data.participantCount : 0,
      comment: data.comment,
      compensationCents: Math.floor(
        parseFloat(data.compensation.replace(',', '.')) * 100,
      ),
    });
    props.handleClose();
    reset(defaultValues);
  }

  const trainer = watch('trainer');

  return (
    <Dialog open={props.open} onClose={props.handleClose}>
      <DialogTitle>Training hinzufügen</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2}>
            <Controller
              control={control}
              name={'date'}
              rules={{ required: true }}
              render={({ field: fieldProps }) => (
                <DatePicker
                  {...fieldProps}
                  label="Datum"
                  maxDate={dayjs()}
                  slotProps={{
                    textField: {
                      required: true,
                    },
                  }}
                />
              )}
            />

            <Suspense fallback={<LoadingSpinner />}>
              <Controller
                control={control}
                name="trainer"
                render={({ field: fieldProps }) => (
                  <Autocomplete
                    {...fieldProps}
                    options={props.getTrainers().sort(compareNamed)}
                    getOptionLabel={(c) => c.name}
                    onChange={(_, data) => {
                      if (!data) setValue('course', null);
                      fieldProps.onChange(data);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Übungsleitung"
                        required={true}
                      />
                    )}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                  />
                )}
              />
            </Suspense>

            <Suspense fallback={<LoadingSpinner />}>
              <Controller
                control={control}
                name="course"
                rules={{ required: true }}
                render={({ field: fieldProps }) => (
                  <Autocomplete
                    {...fieldProps}
                    disabled={!Boolean(trainer)}
                    options={props
                      .getCourses(trainer?.id ?? null)
                      .sort(compareNamed)}
                    getOptionLabel={(c) => c.name}
                    onChange={(_, data) => fieldProps.onChange(data)}
                    renderInput={(params) => (
                      <TextField {...params} label="Kurs" required={true} />
                    )}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                  />
                )}
              />
            </Suspense>

            <Controller
              control={control}
              render={({ field: fieldProps }) => (
                <TextField
                  {...fieldProps}
                  label="Anzahl Teilnehmende"
                  type="number"
                  slotProps={{ htmlInput: { min: 0, max: 999 } }}
                />
              )}
              name="participantCount"
            />

            <Controller
              control={control}
              rules={{
                required: true,
                validate: (v: string) => {
                  if (!v) return true;
                  if (!/^-?\d+(,\d\d)?$/.test(v)) {
                    return 'Das sieht nicht aus wie eine Zahl';
                  }
                  return true;
                },
              }}
              render={({ field: fieldProps }) => (
                <TextField
                  {...fieldProps}
                  required={true}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">€</InputAdornment>
                      ),
                    },
                  }}
                  error={!!errors.compensation?.message}
                  helperText={errors.compensation?.message || ''}
                  label="Betrag"
                />
              )}
              name="compensation"
            />

            <Controller
              control={control}
              render={({ field: fieldProps }) => (
                <TextField {...fieldProps} required={true} label="Kommentar" />
              )}
              name="comment"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.handleClose}>Abbrechen</Button>
          <Button type="submit">Speichern</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
