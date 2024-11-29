import { describe, expect, test } from 'vitest';
import dayjs from 'dayjs';
import { warningsForDate } from '@/lib/warnings-for-date';
import { DayOfWeek } from '@prisma/client';

describe('warnings-for-date', () => {
  test('Warns about future if after today', () => {
    const tomorrow = dayjs().add(1, 'day');
    // WHEN
    const result = warningsForDate(tomorrow.format('YYYY-MM-DD'), [], null);
    // THEN
    expect(result).toContain('Ist in der Zukunft');
  });

  test('No warning about future for today', () => {
    const today = dayjs();
    // WHEN
    const result = warningsForDate(today.format('YYYY-MM-DD'), [], null);
    // THEN
    expect(result).not.toContain('Ist in der Zukunft');
  });

  test('Warns for holiday', () => {
    const holiday = {
      name: 'any-holiday',
      start: '2022-02-01',
      end: '2022-03-01',
    };
    const date = dayjs('2022-02-15');
    // WHEN
    const result = warningsForDate(date.format('YYYY-MM-DD'), [holiday], null);
    // THEN
    expect(result).toContain('any-holiday');
  });

  test('Does not warn if outside of holiday', () => {
    const holiday = {
      name: 'any-holiday',
      start: '2022-02-01',
      end: '2022-03-01',
    };
    const date = dayjs('2023-01-01');
    // WHEN
    const result = warningsForDate(date.format('YYYY-MM-DD'), [holiday], null);
    // THEN
    expect(result).not.toContain('any-holiday');
  });

  test('Warns for sundays', () => {
    const dateOnSunday = dayjs('2024-12-01');
    // WHEN
    const result = warningsForDate(dateOnSunday.format('YYYY-MM-DD'), [], null);
    // THEN
    expect(result.some((w) => w.includes('Sonntag'))).toBe(true);
  });

  test('Warns if not on allowed day', () => {
    const dateOnMonday = dayjs('2024-12-02');
    // WHEN
    const result = warningsForDate(
      dateOnMonday.format('YYYY-MM-DD'),
      [],
      DayOfWeek.TUESDAY,
    );
    // THEN
    expect(result.some((w) => w.includes('Dienstag'))).toBe(true);
  });

  test('Does not warn if on allowed day', () => {
    const dateOnTuesday = dayjs('2024-12-03');
    // WHEN
    const result = warningsForDate(
      dateOnTuesday.format('YYYY-MM-DD'),
      [],
      DayOfWeek.TUESDAY,
    );
    // THEN
    expect(result.some((w) => w.includes('Dienstag'))).toBe(false);
  });
});
