import React, { Suspense } from 'react';
import { CourseDto, TrainingCreateRequest, TrainingDto } from '@/lib/dto';
import DialogContent from '@mui/material/DialogContent';
import {
  TrainingDialogToggle,
  TrainingDialogTypes,
} from '@/app/enter/TrainingDialogToggle';
import Stack from '@mui/system/Stack';
import dayjs from 'dayjs';
import { Controller, useForm } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { compareNamed } from '@/lib/sort-and-filter';
import InputAdornment from '@mui/material/InputAdornment';

type FormData = {
  date: dayjs.Dayjs;
  course: CourseDto | null;
  comment: string;
  compensationString: string;
};

function determineDefaultValues(toEdit: TrainingDto | null): FormData {
  let compensationString = '';
  if (toEdit) {
    const euros = Math.floor(toEdit.compensationCents / 100);
    const cents = Math.floor(toEdit.compensationCents % 100);
    compensationString = `${euros},${cents.toString().padStart(2, '0')}`;
  }

  return {
    date: toEdit?.date ? dayjs(toEdit.date) : dayjs(),
    course: toEdit?.course ?? null,
    comment: toEdit?.comment ?? '',
    compensationString: compensationString,
  };
}

export function TrainingDialogContentForCustom(props: {
  open: boolean;
  handleClose: () => void;
  handleDelete: () => void;
  handleSave: (v: TrainingCreateRequest) => void;
  toEdit: TrainingDto | null;
  setType: (v: TrainingDialogTypes) => void;
  type: TrainingDialogTypes;
  getCourses: () => CourseDto[];
  userId: string;
}) {
  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<FormData>({
    defaultValues: determineDefaultValues(props.toEdit),
  });

  React.useEffect(() => {
    reset(determineDefaultValues(props.toEdit));
  }, [props.toEdit]);

  const onSubmit = (data: FormData) => {
    if (!isValid) return;

    props.handleSave({
      date: data.date.format('YYYY-MM-DD'),
      courseId: data.course!.id,
      compensationCents: Math.floor(
        parseFloat(data.compensationString.replace(',', '.')) * 100,
      ),
      participantCount: 0,
      userId: props.userId,
      comment: data.comment,
    });
    props.handleClose();
    reset(determineDefaultValues(null));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogContent>
        <Stack spacing={2}>
          <TrainingDialogToggle
            type={props.type}
            setType={props.setType}
            disabled={Boolean(props.toEdit)}
          />
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
              name="course"
              render={({ field: fieldProps }) => (
                <Autocomplete
                  {...fieldProps}
                  options={props.getCourses().sort(compareNamed)}
                  getOptionLabel={(c) => c.name}
                  onChange={(_, data) => fieldProps.onChange(data)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Kostenstelle"
                      required={true}
                    />
                  )}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                />
              )}
            />
          </Suspense>

          <Controller
            control={control}
            name="compensationString"
            rules={{
              validate: (v: string) => {
                if (!v) return true;
                if (!/^\d+(,\d\d)?$/.test(v)) {
                  return 'Das sieht nicht aus wie eine Zahl';
                }
                return true;
              },
            }}
            render={({ field: fieldProps }) => (
              <>
                <TextField
                  {...fieldProps}
                  label="Betrag"
                  required={true}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">€</InputAdornment>
                      ),
                    },
                  }}
                  error={!!errors.compensationString?.message}
                  helperText={errors.compensationString?.message || ''}
                />
              </>
            )}
          />

          <Controller
            control={control}
            name="comment"
            render={({ field: fieldProps }) => (
              <TextField {...fieldProps} label="Kommentar" required={true} />
            )}
          />

          <DialogActions>
            <Button onClick={props.handleClose}>Abbrechen</Button>
            {props.toEdit ? (
              <Button
                onClick={() => {
                  props.handleDelete();
                }}
                color={'error'}
              >
                löschen
              </Button>
            ) : null}{' '}
            <Button type="submit">Speichern</Button>
          </DialogActions>
        </Stack>
      </DialogContent>
    </form>
  );
}
