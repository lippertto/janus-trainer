import {
  GridValueFormatterParams,
  GridValueGetterParams,
  GridValueSetterParams,
} from '@mui/x-data-grid';
import dayjs from 'dayjs';

require('dayjs/locale/de');
dayjs.locale('de');

/** formats the day for the front-end (including name of day) */
export function toHumanReadableDate(params: GridValueFormatterParams): string {
  return dayjs(params.value).format('DD.MM.YYYY (dd)');
}

/** The API returns 8601 strings. This method converts the string to a date object to be used by the data grid. */
export function getDateFromIso8601(params: GridValueGetterParams): dayjs.Dayjs {
  const [year, month, day] = params.value.split('-');
  return dayjs(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
}

/** The data grid returns a date object which we need to convert to an iso 8601 string as stored in the domain object. */
export function dateToIso8601(params: GridValueSetterParams) {
  const dateString = dayjs(params.value).format('YYYY-MM-DD');
  return { ...params.row, date: dateString };
}
