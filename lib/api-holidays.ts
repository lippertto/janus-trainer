import dayjs from 'dayjs';
import { Holiday, Prisma } from '@prisma/client';

export async function getHolidays(
  accessToken: string,
  years: number[],
): Promise<Holiday[]> {
  const response = await fetch(`/api/holidays?year=${years.join(',')}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status != 200) {
    return Promise.reject(new Error(await response.text()));
  }
  const value = await response.json();
  if (value === undefined || !Array.isArray(value.value))
    return Promise.reject(new Error('Konnte Antwort nicht verstehen.'));

  return value.value as Holiday[];
}

export async function addHoliday(
  accessToken: string,
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  name: string,
): Promise<Holiday> {
  const request: Prisma.HolidayCreateInput = {
    name,
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
  };
  const response = await fetch(`/api/holidays`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(request),
  });
  if (response.status != 201) {
    return Promise.reject(new Error(await response.text()));
  }
  return (await response.json()) as Holiday;
}

export async function deleteHoliday(
  accessToken: string,
  id: string,
): Promise<void> {
  const response = await fetch(`/api/holidays/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: 'DELETE',
  });
  if (response.status != 204) {
    return Promise.reject(new Error(await response.text()));
  }
}
