import React from 'react';
import dayjs from 'dayjs';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/system/Stack';
import { Controller, useForm } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

type FormData = {
  timeframe: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

const CUSTOM_TIMEFRAME = '-1';

export default function DateDialog(props: {
  open: boolean;
  onClose: () => void;
  startDate: dayjs.Dayjs;
  setStartDate: (v: dayjs.Dayjs) => void;
  endDate: dayjs.Dayjs;
  setEndDate: (v: dayjs.Dayjs) => void;
  options: { label: string; start: dayjs.Dayjs; end: dayjs.Dayjs }[];
}) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({
    defaultValues: {
      timeframe: props.options.length > 0 ? '0' : CUSTOM_TIMEFRAME,
      startDate: props.startDate,
      endDate: props.endDate,
    },
  });

  const onSubmit = (data: FormData) => {
    if (isValid) {
      props.onClose();
      props.setStartDate(data.startDate);
      props.setEndDate(data.endDate);
    }
  };
  const timeframe = watch('timeframe');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  // wtf. Dialog will still show even though props.open is true.
  if (!props.open) return null;

  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Anzeigezeitraum wählen</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Zeitraum</FormLabel>
              <Controller
                rules={{ required: true }}
                control={control}
                name="timeframe"
                render={({ field }) => (
                  <RadioGroup
                    {...field}
                    onChange={(event, timeframeString) => {
                      if (timeframeString !== CUSTOM_TIMEFRAME) {
                        const timeframeIdx = parseInt(timeframeString);
                        if (timeframeIdx >= 0) {
                          setValue(
                            'startDate',
                            props.options[timeframeIdx].start,
                          );
                          setValue('endDate', props.options[timeframeIdx].end);
                        }
                      }
                      field.onChange(event, timeframeString);
                    }}
                  >
                    {props.options.map((o, index) => (
                      <FormControlLabel
                        value={index.toString()}
                        control={<Radio />}
                        label={o.label}
                        key={index.toString()}
                      />
                    ))}
                    <FormControlLabel
                      value={CUSTOM_TIMEFRAME}
                      control={<Radio />}
                      label="Start / Ende"
                      key={CUSTOM_TIMEFRAME}
                    />
                  </RadioGroup>
                )}
              />
            </FormControl>

            <Controller
              control={control}
              name={'startDate'}
              rules={{
                validate: (value, _) =>
                  timeframe !== CUSTOM_TIMEFRAME ||
                  value?.isValid() ||
                  'Kein valides Datum',
              }}
              render={({ field: fieldProps }) => (
                <DatePicker
                  {...fieldProps}
                  label="Start"
                  disabled={timeframe !== CUSTOM_TIMEFRAME}
                  maxDate={endDate ?? null}
                  slotProps={{
                    textField: {
                      error: Boolean(errors.startDate),
                      helperText: errors.startDate
                        ? errors.startDate.message
                        : '',
                      required: true,
                    },
                  }}
                />
              )}
            />
            <Controller
              control={control}
              name={'endDate'}
              rules={{
                validate: (value, _) =>
                  timeframe !== CUSTOM_TIMEFRAME ||
                  value?.isValid() ||
                  'Kein valides Datum',
              }}
              render={({ field: fieldProps }) => (
                <DatePicker
                  {...fieldProps}
                  label="Ende"
                  disabled={timeframe !== CUSTOM_TIMEFRAME}
                  minDate={startDate ?? null}
                  slotProps={{
                    textField: {
                      required: true,
                      error: Boolean(errors.endDate),
                      helperText: errors.endDate ? errors.endDate.message : '',
                    },
                  }}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Abbrechen</Button>
          <Button type="submit">Bestätigen</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
