import { dayOfWeekToHumanReadable, HolidayDto } from '@/lib/dto';
import { DayOfWeek } from '@prisma/client';
import { boolean } from 'property-information/lib/util/types';

function dayOfWeekToInt(d: DayOfWeek): number {
  switch (d) {
    case 'MONDAY':
      return 1;
    case 'TUESDAY':
      return 2;
    case 'WEDNESDAY':
      return 3;
    case 'THURSDAY':
      return 4;
    case 'FRIDAY':
      return 5;
    case 'SATURDAY':
      return 6;
    case 'SUNDAY':
      return 0;
  }
}

export function intToDayOfWeek(day: number): DayOfWeek {
  switch (day) {
    case 0:
      return DayOfWeek.SUNDAY;
    case 1:
      return DayOfWeek.MONDAY;
    case 2:
      return DayOfWeek.TUESDAY;
    case 3:
      return DayOfWeek.WEDNESDAY;
    case 4:
      return DayOfWeek.THURSDAY;
    case 5:
      return DayOfWeek.FRIDAY;
    case 6:
      return DayOfWeek.SATURDAY;
    default:
      throw Error('Bad day. Must be between 0-6');
  }
}

function dateIsInHoliday(
  dateString: string,
  holiday: Pick<HolidayDto, 'start' | 'end'>,
): boolean {
  return dateString >= holiday.start && dateString <= holiday.end;
}

export function warningsForDate(
  dateString: string,
  holidays: HolidayDto[],
  weekday: DayOfWeek | null,
): string[] {
  let result: string[] = [];

  let dayNumber = new Date(dateString).getDay();
  if (dayNumber === 0) {
    result.push('Ist ein Sonntag');
  }

  holidays
    .filter((h) => dateIsInHoliday(dateString, h))
    .map((h) => h.name)
    .forEach((v) => {
      result.push(v);
    });

  if (weekday !== null) {
    if (dayNumber !== dayOfWeekToInt(weekday)) {
      result.push(`Nicht am ${dayOfWeekToHumanReadable(weekday, false)}`);
    }
  }

  return result;
}
