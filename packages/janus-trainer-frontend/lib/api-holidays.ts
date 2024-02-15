import { HolidayCreateRequestDto, HolidayDto } from 'janus-trainer-dto';

import dayjs from 'dayjs';

export async function getHolidays(
  accessToken: string,
  year: number,
): Promise<HolidayDto[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/holidays?year=${year}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (response.status != 200) {
    return Promise.reject(new Error(await response.text()));
  }
  return (await response.json()).value as HolidayDto[];
}

export async function addHoliday(
  accessToken: string,
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  name: string,
): Promise<HolidayDto> {
  const request: HolidayCreateRequestDto = {
    name,
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
  };
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/holidays`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(request),
    },
  );
  if (response.status != 201) {
    return Promise.reject(new Error(await response.text()));
  }
  return (await response.json()) as HolidayDto;
}

export async function deleteHoliday(
  accessToken: string,
  id: string,
): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/holidays/${id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      method: 'DELETE',
    },
  );
  if (response.status != 204) {
    return Promise.reject(new Error(await response.text()));
  }
}
