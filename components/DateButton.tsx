import React from 'react';
import dayjs from 'dayjs';
import Button from '@mui/material/Button';
import DateDialog from '@/components/DateDialog';

export default function DateButton(props: {
  startDate: dayjs.Dayjs;
  setStartDate: (v: dayjs.Dayjs) => void;
  endDate: dayjs.Dayjs;
  setEndDate: (v: dayjs.Dayjs) => void;
  options: { label: string; start: dayjs.Dayjs; end: dayjs.Dayjs }[];
}) {
  const [showDialog, setShowDialog] = React.useState<boolean>(false);

  const text =
    props.startDate.format('DD.MM.YYYY') +
    ' - ' +
    props.endDate.format('DD.MM.YYYY');

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        data-testid="timeframe-button"
      >
        {text}
      </Button>

      <DateDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        startDate={props.startDate}
        setStartDate={props.setStartDate}
        endDate={props.endDate}
        setEndDate={props.setEndDate}
        options={props.options}
      />
    </>
  );
}
