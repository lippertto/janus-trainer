import dayjs from 'dayjs';
import { CompensationGroup } from '@prisma/client';
import { Group } from '@/lib/dto';

require('dayjs/locale/de');
dayjs.locale('de');

/**
 * Provides a date string (anything that dayjs can parse) into a human-readable version
 * @param value any string that dayjs can parse.
 */
export function dateToHumanReadable(value: string) {
  return dayjs(value).format('DD.MM.YYYY (dd)');
}

/** Takes a number of cents and displays them formatted in Euros */
export function centsToDisplayString(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** The API returns 8601 strings. This method converts the string to a date object to be used by the data grid. */
export function getDateFromIso8601(value: string): dayjs.Dayjs {
  const [year, month, day] = value.split('-');
  return dayjs(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
}

export function compensationGroupToHumanReadable(option: CompensationGroup) {
  switch (option) {
    case CompensationGroup.WITH_QUALIFICATION:
      return 'Mit Quali';
    case CompensationGroup.NO_QUALIFICATION:
      return 'Ohne Quali';
    case CompensationGroup.LEAGUE:
      return 'Liga';
    default:
      return '???';
  }
}

export function groupToHumanReadable(group: Group) {
  switch (group) {
    case Group.ADMINS:
      return "Administratoren";
    case Group.TRAINERS:
      return "Übungsleiter";
    default:
      return "???";
  }
}