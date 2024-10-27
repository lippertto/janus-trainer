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

export default function ReportPageContainer() {
  const [startDate, setStartDate] = React.useState(dayjs().startOf('year'));
  const [endDate, setEndDate] = React.useState(dayjs().endOf('year'));

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }
  if (!session) {
    return <LoadingSpinner />;
  }

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
    const objectUrl = window.URL.createObjectURL(pdfData);
    const link = document.createElement('a');
    link.download = `Janus-Statistik-${dayjs().format('YYYY-MM-DD')}.pdf`;
    link.href = objectUrl;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
  };

  return (
    <ReportPage
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      getReportCourses={getReportCourses}
      handleDownloadClick={handleDownloadClick}
    />
  );
}
