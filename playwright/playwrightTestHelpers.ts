import dayjs from 'dayjs';
import { Page } from 'playwright-core';

export async function fillOutDatePicker(
  page: Page,
  groupName: string,
  date: dayjs.Dayjs,
) {
  const group = page.getByRole('group', { name: groupName });
  await group
    .getByRole('spinbutton', { name: 'Year' })
    .fill(date.format('YYYY'));
  await group
    .getByRole('spinbutton', { name: 'Month' })
    .fill(date.format('MM'));
  await group.getByRole('spinbutton', { name: 'Day' }).fill(date.format('DD'));
}
