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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

type FormData = {
  date: dayjs.Dayjs;
  courseId: string;
  comment: string;
  compensationString: string;
};

function determineDefaultValues(
  toEdit: TrainingDto | null,
  courses: CourseDto[],
): FormData {
  let compensationString = '';
  let courseId = courses.length > 0 ? courses[0].id.toString() : '';
  if (toEdit) {
    const euros = Math.floor(toEdit.compensationCents / 100);
    const cents = Math.floor(toEdit.compensationCents % 100);
    compensationString = `${euros},${cents.toString().padStart(2, '0')}`;
    courseId = toEdit.courseId.toString();
  }

  return {
    date: toEdit?.date ? dayjs(toEdit.date) : dayjs(),
    courseId: courseId,
    comment: toEdit?.comment ?? '',
    compensationString: compensationString,
  };
}

export function SelectForCostCenterCourses(props: {
  value: string;
  onChange: (event: SelectChangeEvent<string>, child: React.ReactNode) => void;
  ref: React.Ref<any>;
  courses: CourseDto[];
}) {
  const menuItems = props.courses
    .sort(compareNamed)
    .map((course) => <MenuItem value={course.id}>{course.name}</MenuItem>);

  const labelId = 'enter-training-dialog-course-label';
  return (
    <FormControl>
      <InputLabel id={labelId}>Kostenstelle</InputLabel>
      <Select
        labelId={labelId}
        id="enter-training-dialog-course-select"
        value={props.value}
        onChange={props.onChange}
        required={true}
        inputRef={props.ref}
        label="Kostenstelle"
        data-testid="enter-training-dialog-costcenter-select"
      >
        {menuItems}
      </Select>
    </FormControl>
  );
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
  const courses = props.getCourses();
  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<FormData>({
    defaultValues: determineDefaultValues(props.toEdit, courses),
  });

  React.useEffect(() => {
    reset(determineDefaultValues(props.toEdit, courses));
  }, [props.toEdit]);

  const onSubmit = (data: FormData) => {
    if (!isValid) return;

    props.handleSave({
      date: data.date.format('YYYY-MM-DD'),
      courseId: parseInt(data.courseId!),
      compensationCents: Math.floor(
        parseFloat(data.compensationString.replace(',', '.')) * 100,
      ),
      participantCount: 0,
      userId: props.userId,
      comment: data.comment,
    });
    props.handleClose();
    reset(determineDefaultValues(null, courses));
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
                slotProps={{
                  textField: {
                    required: true,
                  },
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="courseId"
            render={({ field }) => (
              <SelectForCostCenterCourses {...field} courses={courses} />
            )}
          />

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
                    htmlInput: {
                      inputMode: 'decimal',
                      'data-testid': 'training-dialog-custom-amount-field',
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
              <TextField
                {...fieldProps}
                label="Kommentar"
                required={true}
                slotProps={{
                  htmlInput: {
                    'data-testid': 'training-dialog-custom-comment-field',
                  },
                }}
              />
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
            <Button type="submit" data-testid="enter-training-save-button">
              Speichern
            </Button>
          </DialogActions>
        </Stack>
      </DialogContent>
    </form>
  );
}
