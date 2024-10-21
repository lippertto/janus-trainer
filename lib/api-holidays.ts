import dayjs from 'dayjs';
import { Holiday, Prisma } from '@prisma/client';

export async function addHoliday(
  accessToken: string,
  start: string,
  end: string,
  name: string,
): Promise<Holiday> {
  const request: Prisma.HolidayCreateInput = {
    name,
    start,
    end,
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
