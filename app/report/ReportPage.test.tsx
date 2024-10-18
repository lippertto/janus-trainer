/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportPage } from '@/app/report/ReportPage';
import dayjs from 'dayjs';
import { TrainerReportCourseDto } from '@/lib/dto';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import 'dayjs/locale/de';
import { SnackbarProvider } from 'notistack';

describe('ReportPage', () => {
  test('Does not export more than 5 courses', async () => {
    const courses: TrainerReportCourseDto[] = [1, 2, 3, 4, 5, 6].map((n) => ({
      courseId: n,
      courseName: `course-${n.toString()}`,
      trainings: [],
    }));

    const handleDownloadClick = jest.fn();
    render(
      <SnackbarProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
          <ReportPage
            startDate={dayjs().startOf('year')}
            endDate={dayjs().endOf('year')}
            setStartDate={jest.fn()}
            setEndDate={jest.fn()}
            getReportCourses={() => courses}
            handleDownloadClick={handleDownloadClick}
          />
        </LocalizationProvider>
      </SnackbarProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /export/i,
      }),
    );

    expect(handleDownloadClick).not.toHaveBeenCalled();
  });

  test('Calls export with 5 or less courses', async () => {
    const courses: TrainerReportCourseDto[] = [1, 2, 3, 4, 5].map((n) => ({
      courseId: n,
      courseName: `course-${n.toString()}`,
      trainings: [],
    }));

    const handleDownloadClick = jest.fn();
    render(
      <SnackbarProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
          <ReportPage
            startDate={dayjs().startOf('year')}
            endDate={dayjs().endOf('year')}
            setStartDate={jest.fn()}
            setEndDate={jest.fn()}
            getReportCourses={() => courses}
            handleDownloadClick={handleDownloadClick}
          />
        </LocalizationProvider>
      </SnackbarProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /export/i,
      }),
    );

    expect(handleDownloadClick).toHaveBeenCalled();
  });
});
