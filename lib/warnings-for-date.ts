import { HolidayDto } from '@/lib/dto';
import { DayOfWeek } from '@prisma/client';

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
      throw Error("Bad day. Must be between 0-6");
  }
}

const GERMAN_DAYS: string[] = new Array(7);
GERMAN_DAYS[0] = 'So';
GERMAN_DAYS[1] = 'Mo';
GERMAN_DAYS[2] = 'Di';
GERMAN_DAYS[3] = 'Mi';
GERMAN_DAYS[4] = 'Do';
GERMAN_DAYS[5] = 'Fr';
GERMAN_DAYS[6] = 'Sa';

export function warningsForDate(dateString: string, holidays: HolidayDto[], weekdays: DayOfWeek[]): string[] {
  let result: string[] = [];
  let dayNumber = new Date(dateString).getDay();
  if (dayNumber === 0) {
    result.push('Ist ein Sonntag');
  }
  for (const h of holidays) {
    if (dateString >= h.start && dateString <= h.end) {
      result.push(`Kollidiert mit "${h.name}"`);
    }
  }
  let isOnValidWeekday = false;
  for (const wd of weekdays) {
    if (dayNumber === dayOfWeekToInt(wd)) {
      isOnValidWeekday = true;
    }
  }
  if (!isOnValidWeekday) {
    const allowedDays = weekdays.map(
      (wd) => (GERMAN_DAYS.at(dayOfWeekToInt(wd))),
    ).join(', ');
    result.push(`Nicht an Kurstag (${allowedDays})`);
  }

  return result;
}