import dayjs from 'dayjs';

/**
 * Provides a date string (anything that dayjs can parse) into a human-readable version
 * @param value any string that dayjs can parse.
 */
export function dateToHumanReadable(value: string) {
  return dayjs(value).format('DD.MM.YYYY (dd)');
}