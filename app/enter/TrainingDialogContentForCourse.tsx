import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import { Controller, useForm } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import React from 'react';
import {
  CompensationValueDto,
  CourseDto,
  dayOfWeekToHumanReadable,
  TrainingCreateRequest,
  TrainingDto,
} from '@/lib/dto';
import { DayOfWeek } from '@prisma/client';
import { centsToHumanReadable } from '@/lib/formatters';
import { compareByField } from '@/lib/sort-and-filter';
import {
  TrainingDialogToggle,
  TrainingDialogTypes,
} from '@/app/enter/TrainingDialogToggle';

type FormData = {
  comment: string;
  course: CourseDto | null;
  date: dayjs.Dayjs;
  participantCount: string;
  compensationValue: CompensationValueDto | null;
};

function determineDefaultCourse(courses: CourseDto[], today: DayOfWeek) {
  if (courses.length === 1) {
    return courses[0];
  }
  return courses.find((c) => c.weekday === today) ?? courses[0];
}

function determineDefaultCompensationValueForCourse(
  compensationValues: CompensationValueDto[],
  course: CourseDto | null,
): CompensationValueDto | null {
  if (!compensationValues || compensationValues.length === 0) {
    return null;
  }
  if (!course) return null;
  return (
    compensationValues.find(
      (cv) => cv.durationMinutes === course.durationMinutes,
    ) ?? compensationValues[0]
  );
}

function determineDefaultCompensationValue(
  compensationValues: CompensationValueDto[],
  course: CourseDto | null,
  toEdit: TrainingDto | null,
): CompensationValueDto | null {
  if (compensationValues.length === 0) {
    return null;
  }
  if (compensationValues.length === 1) {
    return compensationValues[0];
  }
  if (toEdit) {
    // we have ensured that a cv with the compensation cents exists, so we can assert that a value exists.
    return compensationValues.find(
      (cv) => cv.cents === toEdit.compensationCents,
    )!;
  } else if (course) {
    return determineDefaultCompensationValueForCourse(
      compensationValues,
      course,
    );
  } else {
    return compensationValues[0];
  }
}

function courseDisplayname(c: CourseDto): string {
  let prefix = '';
  if (!c.isCustomCourse && c.weekday !== null) {
    prefix = `(${dayOfWeekToHumanReadable(c.weekday, true)}): `;
  }
  return `${prefix}${c.name}`;
}

function compensationValueToText(cv: CompensationValueDto) {
  return `${cv.description} (${centsToHumanReadable(cv.cents)})`;
}

function prepareCompensationValues(
  compensationValues: CompensationValueDto[],
  toEdit: TrainingDto | null,
) {
  let result = [...compensationValues];
  // add new compensation value in case the one from toEdit has no corresponding value.
  if (toEdit) {
    if (
      compensationValues.findIndex(
        (cv) => cv.cents === toEdit.compensationCents,
      ) === -1
    ) {
      result.push({
        id: -1,
        cents: toEdit.compensationCents,
        description: centsToHumanReadable(toEdit.compensationCents),
        compensationClassId: -1,
        durationMinutes: toEdit.course!.durationMinutes,
      });
    }
  }
  result.sort((a, b) => compareByField(a, b, 'cents'));
  return result;
}

function determineDefaultValues(
  toEdit: TrainingDto | null,
  courses: CourseDto[],
  compensationValues: CompensationValueDto[],
  today: DayOfWeek,
): FormData {
  let course = toEdit?.course ?? determineDefaultCourse(courses, today);
  return {
    comment: toEdit?.comment ?? '',
    course: course,
    date: toEdit?.date ? dayjs(toEdit.date) : dayjs(),
    participantCount: toEdit?.participantCount?.toString() ?? '',
    compensationValue: determineDefaultCompensationValue(
      compensationValues,
      course,
      toEdit,
    ),
  };
}

export function TrainingDialogContentForCourse(props: {
  type: TrainingDialogTypes;
  setType: (v: TrainingDialogTypes) => void;
  handleClose: () => void;
  handleDelete: () => void;
  handleSave: (v: TrainingCreateRequest) => void;
  userId: string;
  courses: CourseDto[];
  toEdit: TrainingDto | null;
  today: DayOfWeek;
  compensationValues: CompensationValueDto[];
}) {
  const enrichedCompensationValues = prepareCompensationValues(
    props.compensationValues,
    props.toEdit,
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    getValues,
    formState: { isValid },
  } = useForm<FormData>({
    defaultValues: determineDefaultValues(
      props.toEdit,
      props.courses,
      enrichedCompensationValues,
      props.today,
    ),
  });

  const watchCourse = watch('course');

  // when the course has changed, update the compensation value accordingly
  React.useEffect(() => {
    const courseValue = getValues('course');

    // if we have a 'toEdit' and the currently selected course is the one that is in 'toEdit', we use the
    // compensationValue from 'toEdit'.
    if (props.toEdit && courseValue) {
      if (courseValue.id === props.toEdit.course!.id) {
        setValue(
          'compensationValue',
          enrichedCompensationValues.find(
            (cv) => cv.cents === props.toEdit!.compensationCents,
          )!,
        );
        return;
      }
    }

    setValue(
      'compensationValue',
      determineDefaultCompensationValueForCourse(
        enrichedCompensationValues,
        courseValue,
      ),
    );
  }, [watchCourse]);

  React.useEffect(() => {
    reset(
      determineDefaultValues(
        props.toEdit,
        props.courses,
        enrichedCompensationValues,
        props.today,
      ),
    );
  }, [props.toEdit, props.type]);

  const onSubmit = (data: FormData) => {
    if (isValid) {
      props.handleSave({
        comment: data.comment,
        compensationCents: data.compensationValue!.cents,
        courseId: data.course!.id!,
        date: data.date.format('YYYY-MM-DD'),
        participantCount: parseInt(data.participantCount),
        userId: props.userId,
      });
      props.handleClose();
      reset(
        determineDefaultValues(
          null,
          props.courses,
          enrichedCompensationValues,
          props.today,
        ),
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogContent>
        <Stack direction={'column'} spacing={2}>
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

          <Controller
            control={control}
            name="course"
            render={({ field: fieldProps }) => (
              <Autocomplete
                {...fieldProps}
                options={props.courses}
                getOptionLabel={courseDisplayname}
                onChange={(e, data) => fieldProps.onChange(data)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kurs"
                    placeholder={
                      props.courses.length === 0
                        ? 'Keine Kurse hinterlegt'
                        : undefined
                    }
                    required={true}
                  />
                )}
                isOptionEqualToValue={(a, b) => a.id === b.id}
              />
            )}
          />

          <Controller
            control={control}
            name="compensationValue"
            render={({ field: fieldProps }) => {
              return (
                <Autocomplete
                  {...fieldProps}
                  options={enrichedCompensationValues}
                  getOptionLabel={compensationValueToText}
                  onChange={(e, data) => fieldProps.onChange(data)}
                  renderInput={(params) => (
                    <TextField {...params} label="Vergütung" required={true} />
                  )}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                />
              );
            }}
          />

          <TextField
            label="Anzahl Personen"
            required={true}
            type="number"
            {...register('participantCount')}
            slotProps={{ htmlInput: { min: 0, max: 999 } }}
          />

          <TextField label="Kommentar" {...register('comment')} />
        </Stack>
      </DialogContent>
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
    </form>
  );
}
