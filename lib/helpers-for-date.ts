import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

export const FIRST_DAY_OF_THIS_QUARTER = dayjs().startOf('quarter');
export const LAST_DAY_OF_THIS_QUARTER = dayjs().endOf('quarter');

export const FIRST_DAY_OF_PREVIOUS_QUARTER = dayjs()
  .subtract(1, 'quarter')
  .startOf('quarter');
export const LAST_DAY_OF_PREVIOUS_QUARTER = dayjs()
  .subtract(1, 'quarter')
  .endOf('quarter');

export function isCurrentQuarter(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): boolean {
  return (
    startDate.isSame(FIRST_DAY_OF_THIS_QUARTER, 'days') &&
    endDate.isSame(LAST_DAY_OF_THIS_QUARTER, 'days')
  );
}

export function isPreviousQuarter(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): boolean {
  return (
    startDate.isSame(FIRST_DAY_OF_PREVIOUS_QUARTER, 'days') &&
    endDate.isSame(LAST_DAY_OF_PREVIOUS_QUARTER, 'days')
  );
}
