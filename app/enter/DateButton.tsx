import React from 'react';
import dayjs from 'dayjs';
import Button from '@mui/material/Button';
import { isCurrentQuarter, isPreviousQuarter } from '@/lib/helpers-for-date';

export default function DateButton(props: {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  onClick: () => void;
}) {
  let text = '';
  if (isCurrentQuarter(props.startDate, props.endDate)) {
    text = 'Aktuelles Quartal';
  } else if (isPreviousQuarter(props.startDate, props.endDate)) {
    text = 'Letztes Quartal';
  } else {
    text =
      props.startDate.format('DD.MM.YYYY') +
      ' - ' +
      props.endDate.format('DD.MM.YYYY');
  }

  return <Button onClick={props.onClick}>{text}</Button>;
}
