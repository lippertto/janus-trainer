import React from 'react';
import dayjs from 'dayjs';
import Button from '@mui/material/Button';

export default function DateButton(props: {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  onClick: () => void;
}) {
  const text =
    props.startDate.format('DD.MM.YYYY') +
    ' - ' +
    props.endDate.format('DD.MM.YYYY');

  return (
    <Button onClick={props.onClick} data-testid="timeframe-button">
      {text}
    </Button>
  );
}
