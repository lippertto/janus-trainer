/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import TrainingDialog, { selectCompensationValue } from '@/components/TrainingDialog';
import { CompensationGroup, DayOfWeek } from '@prisma/client';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { CompensationValueDto } from '@/lib/dto';


test('Fallback for non-matching compensation values', async () => {
  const compensationValues = [
    {
      'id': 1,
      'cents': 1900,
      'description': 'Ohne Quali / 90min',
      'durationMinutes': 90,
      'compensationGroup': CompensationGroup.NO_QUALIFICATION,
    },
    {
      'id': 2,
      'cents': 1900,
      'description': 'Ohne Quali / 75min',
      'durationMinutes': 75,
      'compensationGroup': CompensationGroup.NO_QUALIFICATION,
    },
  ];

  const courses = [
    {
      'id': 2,
      'name': 'Kurs für automatische Tests',
      'weekdays': [
        DayOfWeek.WEDNESDAY,
      ],
      'startHour': 19,
      'startMinute': 0,
      'durationMinutes': 60,
      'trainers': [
        {
          'id': 'd0dc09cc-50d1-70aa-5e26-b2ca3961320e',
          'iban': 'NL75INGB9737375777',
          'name': 'Playwright Test Trainer',
          'deletedAt': null,
          'compensationGroups': [
            CompensationGroup.NO_QUALIFICATION,
          ],
        },
      ],
    },
  ];

  render(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
      <TrainingDialog
        open={true}
        userId={'userId'}
        handleClose={() => {
        }}
        handleSave={() => {
        }}
        handleDelete={() => {
        }}
        toEdit={null}
        courses={courses}
        compensationValues={compensationValues}
      /></LocalizationProvider>);

  // First course is automatically selected
  let coursesDropdown = screen.queryByTestId('courses-dropdown-input')! as HTMLInputElement;
  expect(coursesDropdown!.value).toBe('Kurs für automatische Tests');
  // First compensation value is selected when none fit the duration
  let compensationValueDropdown = screen.queryByTestId('compensation-value-dropdown-input')! as HTMLInputElement;
  expect(
    compensationValueDropdown.value).toBe('Ohne Quali / 90min (19,00 €)');
});

describe('compensation value selection', () => {
  test('cv with matching duration is selected', () => {
    // GIVEN
    const course = { durationMinutes: 120 };
    const compensationValues = [
      { durationMinutes: 90, id: 1 }, { durationMinutes: 120, id: 2 }, { durationMinutes: 75, id: 3 },
    ] as CompensationValueDto[];
    // WHEN
    const selected = selectCompensationValue(course, compensationValues);
    // THEN
    expect(selected).toBe(compensationValues[1]);
  });
});