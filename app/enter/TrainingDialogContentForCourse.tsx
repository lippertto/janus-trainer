import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import { Controller, useForm } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
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
import { DayOfWeek } from '@/generated/prisma/enums';
import { centsToHumanReadable } from '@/lib/formatters';
import { compareByField, compareNamed } from '@/lib/sort-and-filter';
import {
  TrainingDialogToggle,
  TrainingDialogTypes,
} from '@/app/enter/TrainingDialogToggle';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { SelectChangeEvent } from '@mui/material/Select';

type FormData = {
  comment: string;
  courseId: string; // may be ''
  date: dayjs.Dayjs;
  participantCount: string;
  compensationValueId: string; // may be ''
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
    courseId: course?.id?.toString() ?? '',
    date: toEdit?.date ? dayjs(toEdit.date) : dayjs(),
    participantCount: toEdit?.participantCount?.toString() ?? '',
    compensationValueId:
      determineDefaultCompensationValue(
        compensationValues,
        course,
        toEdit,
      )?.id?.toString() ?? '',
  };
}

function SelectForCompensationValues(props: {
  value: string;
  onChange: (event: SelectChangeEvent<string>, child: React.ReactNode) => void;
  inputRef: React.Ref<any>;
  compensationValues: CompensationValueDto[];
}) {
  let menuItems;
  if (props.compensationValues.length === 0) {
    menuItems = (
      <MenuItem value="">
        Keine Pauschalen hinterlegt. Bitte beim Büro melden.
      </MenuItem>
    );
  } else {
    menuItems = props.compensationValues.map((compensationValue) => (
      <MenuItem value={compensationValue.id}>
        {compensationValueToText(compensationValue)}
      </MenuItem>
    ));
  }

  const labelId = 'enter-training-dialog-compensation-label';

  return (
    <FormControl>
      <InputLabel id={labelId}>Vergütung</InputLabel>

      <Select
        labelId={labelId}
        id="enter-training-dialog-compensation-select"
        value={props.value}
        onChange={props.onChange}
        required={true}
        inputRef={props.inputRef}
        label="Vergütung"
      >
        {menuItems}
      </Select>
    </FormControl>
  );
}

function SelectForCourses(props: {
  value: string;
  onChange: (event: SelectChangeEvent<string>, child: React.ReactNode) => void;
  inputRef: React.Ref<any>;
  courses: CourseDto[];
}) {
  let menuItems;
  if (props.courses.length === 0) {
    menuItems = (
      <MenuItem value="">
        Keine Kurse hinterlegt. Bitte beim Büro melden.
      </MenuItem>
    );
  } else {
    menuItems = props.courses.map((course) => (
      <MenuItem value={course.id}>{courseDisplayname(course)}</MenuItem>
    ));
  }

  const labelId = 'enter-training-dialog-course-label';
  return (
    <FormControl>
      <InputLabel id={labelId}>Kurs</InputLabel>
      <Select
        labelId={labelId}
        id="enter-training-dialog-course-select"
        value={props.value}
        onChange={props.onChange}
        required={true}
        inputRef={props.inputRef}
        label="Kurs"
      >
        {menuItems}
      </Select>
    </FormControl>
  );
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

  const watchCourseId = watch('courseId');

  // when the course has changed, update the compensation value accordingly
  React.useEffect(() => {
    const courseIdValue = getValues('courseId');

    // if we have a 'toEdit' and the currently selected course is the one that is in 'toEdit', we use the
    // compensationValue from 'toEdit'.
    if (props.toEdit && courseIdValue) {
      if (courseIdValue === props.toEdit.course!.id.toString()) {
        setValue(
          'compensationValueId',
          enrichedCompensationValues
            .find((cv) => cv.cents === props.toEdit!.compensationCents)!
            .id.toString(),
        );
        return;
      }
    }

    setValue(
      'compensationValueId',
      determineDefaultCompensationValueForCourse(
        enrichedCompensationValues,
        props.courses.find((c) => c.id === parseInt(courseIdValue)) ?? null,
      )?.id?.toString() ?? '',
    );
  }, [watchCourseId]);

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
      const compensationValue = enrichedCompensationValues.find(
        (cv) => cv.id === parseInt(data.compensationValueId),
      );
      props.handleSave({
        comment: data.comment,
        compensationCents: compensationValue!.cents,
        courseId: parseInt(data.courseId!),
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
            render={({ field: fieldProps }) => (
              <SelectForCourses
                value={fieldProps.value}
                onChange={fieldProps.onChange}
                inputRef={fieldProps.ref}
                courses={props.courses}
              />
            )}
          />

          <Controller
            control={control}
            name="compensationValueId"
            render={({ field: fieldProps }) => (
              <SelectForCompensationValues
                value={fieldProps.value}
                onChange={fieldProps.onChange}
                inputRef={fieldProps.ref}
                compensationValues={enrichedCompensationValues}
              />
            )}
          />

          <TextField
            label="Anzahl Personen"
            required={true}
            type="number"
            {...register('participantCount')}
            slotProps={{
              htmlInput: { min: 0, max: 999, inputMode: 'numeric' },
            }}
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
        <Button type="submit" data-testid="enter-training-save-button">
          Speichern
        </Button>
      </DialogActions>
    </form>
  );
}
