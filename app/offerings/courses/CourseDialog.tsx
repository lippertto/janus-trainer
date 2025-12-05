import React from 'react';
import { DayOfWeek } from '@/generated/prisma/enums';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { Autocomplete, Chip } from '@mui/material';
import Stack from '@mui/material/Stack';
import { TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import {
  CourseCreateRequest,
  CourseDto,
  dayOfWeekToHumanReadable,
  CostCenterDto,
  UserDto,
} from '@/lib/dto';
import { Controller, ControllerRenderProps, useForm } from 'react-hook-form';
import { compareNamed } from '@/lib/sort-and-filter';

type UserIdAndName = Pick<UserDto, 'id' | 'name'>;

const WEEKDAY_OPTIONS = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

function TrainerDropdown(props: {
  allTrainers: UserIdAndName[];
  currentTrainerSelection: UserIdAndName[];
  handleTrainerSelectionChange: (v: UserIdAndName[]) => void;
  controllerProps: ControllerRenderProps<FormData, 'selectedTrainers'>;
}) {
  return (
    <Autocomplete
      {...props.controllerProps}
      options={props.allTrainers}
      multiple={true}
      renderTags={(tagValue, _) => {
        return tagValue.map((option: UserIdAndName, _) => (
          <Chip
            label={option.name}
            key={option.id}
            onDelete={() => {
              props.handleTrainerSelectionChange(
                props.currentTrainerSelection.filter((t) => t.id !== option.id),
              );
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
      getOptionLabel={(t: UserIdAndName) => t.name}
      renderInput={(params) => <TextField {...params} label="Übungsleitung" />}
      onChange={(_, value: UserIdAndName[]) => {
        props.handleTrainerSelectionChange(value);
      }}
      // this method needs to be set to sync the value with the list
      isOptionEqualToValue={(option: UserIdAndName, value: UserIdAndName) => {
        return option.id === value.id;
      }}
    />
  );
}

function CostCenterDropDown(props: {
  costCenters: CostCenterDto[];
  controllerProps: ControllerRenderProps<FormData, 'costCenter'>;
  handleCostCenterChange: (v: CostCenterDto | null) => void;
}) {
  return (
    <Autocomplete
      {...props.controllerProps}
      renderInput={(params) => (
        <TextField {...params} required={true} label={'Kostenstelle'} />
      )}
      renderOption={(props, option) => {
        return (
          <li {...props} key={option.id}>
            {option.name}
          </li>
        );
      }}
      options={props.costCenters.toSorted(compareNamed)}
      onChange={(_, value) => {
        props.handleCostCenterChange(value);
      }}
      getOptionLabel={(d: CostCenterDto) => {
        return d.name;
      }}
      isOptionEqualToValue={(option, value) => option.id === value.id}
    />
  );
}

type FormData = {
  courseName: string;
  dayOfWeek: DayOfWeek | null;
  time: dayjs.Dayjs | null;
  duration: number;
  selectedTrainers: Pick<UserDto, 'name' | 'id'>[];
  costCenter: CostCenterDto | null;
};

function defaultValuesFor(
  course: CourseDto | null,
  costCenters: CostCenterDto[],
): FormData {
  const costCenter =
    costCenters.find((cc) => cc.id === course?.costCenterId) ?? null;
  let time;
  if (course && course.startHour !== null && course.startMinute !== null) {
    time = dayjs().hour(course.startHour).minute(course.startMinute);
  } else {
    time = dayjs().hour(19).minute(0);
  }
  return {
    courseName: course?.name ?? '',
    dayOfWeek: course?.weekday ?? null,
    duration: course?.durationMinutes ?? 60,
    selectedTrainers: course?.trainers ?? [],
    costCenter,
    time,
  };
}

export function CourseDialog(props: {
  open: boolean;
  handleClose: () => void;
  handleSave: (data: CourseCreateRequest) => void;
  trainers: UserDto[];
  costCenters: CostCenterDto[];
  toEdit: CourseDto | null;
}) {
  const [previous, setPrevious] = React.useState<CourseDto | null>(null);

  const {
    control,
    reset,
    formState: { isValid },
    getValues,
    setValue,
    handleSubmit,
  } = useForm<FormData>({
    defaultValues: defaultValuesFor(null, props.costCenters),
  });

  const onSubmit = (data: FormData) => {
    if (!isValid) return;
    setTimeout(reset, 300);
    props.handleClose();
    props.handleSave({
      name: data.courseName.trim(),
      durationMinutes: data.duration,
      startHour: data.time!.hour(),
      startMinute: data.time!.minute(),
      weekday: data.dayOfWeek,
      trainerIds: data.selectedTrainers.map((t) => t.id),
      costCenterId: data.costCenter!.id,
    });
  };

  React.useEffect(() => {
    if (props.toEdit !== previous) {
      reset(defaultValuesFor(props.toEdit, props.costCenters));
      setPrevious(props.toEdit);
    }
  }, [props.toEdit]);

  return (
    <Dialog open={props.open} onClose={props.handleClose}>
      <DialogTitle>
        {props.toEdit ? 'Kurs bearbeiten' : 'Kurs hinzufügen'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="courseName"
              render={({ field: fieldProps }) => (
                <TextField
                  {...fieldProps}
                  label="Name des Kurses"
                  required={true}
                  slotProps={{
                    htmlInput: { 'data-testid': 'enter-course-textfield' },
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="time"
              render={({ field: fieldProps }) => (
                <TimePicker
                  {...fieldProps}
                  label="Uhrzeit"
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
              name="duration"
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(event) => {
                    if (event.target.value !== '')
                      field.onChange(parseInt(event.target.value, 10));
                    else {
                      field.onChange(0);
                    }
                  }}
                  label="Dauer"
                  type="number"
                  slotProps={{ htmlInput: { step: 15, min: 15 } }}
                />
              )}
            />

            <Controller
              control={control}
              name="selectedTrainers"
              render={({ field: fieldProps }) => (
                <TrainerDropdown
                  allTrainers={props.trainers}
                  currentTrainerSelection={getValues('selectedTrainers')}
                  handleTrainerSelectionChange={(v) =>
                    setValue('selectedTrainers', v)
                  }
                  controllerProps={fieldProps}
                />
              )}
            />

            <Controller
              control={control}
              name="costCenter"
              render={({ field: fieldProps }) => (
                <CostCenterDropDown
                  costCenters={props.costCenters}
                  controllerProps={fieldProps}
                  handleCostCenterChange={(v) => setValue('costCenter', v)}
                />
              )}
            />

            <Controller
              control={control}
              name="dayOfWeek"
              render={({ field: fieldProps }) => (
                <Autocomplete
                  {...fieldProps}
                  options={WEEKDAY_OPTIONS}
                  renderInput={(params) => (
                    <TextField {...params} label={'Wochentag'} />
                  )}
                  getOptionLabel={(wd: DayOfWeek) =>
                    dayOfWeekToHumanReadable(wd)
                  }
                  onChange={(_, value) => {
                    setValue('dayOfWeek', value);
                  }}
                />
              )}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setTimeout(reset, 300);
              props.handleClose();
            }}
          >
            Abbrechen
          </Button>
          <Button disabled={!isValid} type="submit">
            Speichern
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
