'use client';
import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import React from 'react';
import { ReportPage } from '@/app/report/ReportPage';
import dayjs from 'dayjs';
import {
  downloadTrainerReport,
  queryTrainerReport,
} from '@/app/report/queries';
import {
  getMaxCentsPerYearQuery,
  getMaxTrainingsPerCourseQuery,
} from '@/lib/shared-queries';

export default function ReportPageContainer() {
  const [startDate, setStartDate] = React.useState(dayjs().startOf('year'));
  const [endDate, setEndDate] = React.useState(dayjs().endOf('year'));

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const getReportCourses = () => {
    return queryTrainerReport(
      session.accessToken,
      session.userId,
      startDate,
      endDate,
    ).data.courses;
  };

  const handleDownloadClick = async () => {
    const pdfData = await downloadTrainerReport(
      session.accessToken,
      session.userId,
      startDate,
      endDate,
    );

    const filename = `Janus-Statistik-${dayjs().format('YYYY-MM-DD')}.pdf`;

    const objectUrl = window.URL.createObjectURL(pdfData);
    const link = document.createElement('a');
    link.download = filename;
    link.href = objectUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 100);
  };

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  } else if (!session) {
    return <LoadingSpinner />;
  } else {
    return (
      <ReportPage
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        getReportCourses={getReportCourses}
        handleDownloadClick={handleDownloadClick}
        getMaxCentsPerYear={() =>
          getMaxCentsPerYearQuery(session.accessToken).data
        }
        getMaxTrainingsPerCourse={() =>
          getMaxTrainingsPerCourseQuery(session.accessToken).data
        }
      />
    );
  }
}
