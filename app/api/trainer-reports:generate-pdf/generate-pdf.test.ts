import { generatePdf } from '@/app/api/trainer-reports:generate-pdf/generate-pdf';
import fs from 'node:fs';
import dayjs from 'dayjs';

describe('pdf generation', () => {
  test('generates pdf (happy case)', async () => {
    const data = await generatePdf(dayjs(), {
      trainerName: 'Dr. Tobias Lippert',
      periodStart: dayjs('2024-01-01'),
      periodEnd: dayjs('2024-12-31'),
      docId: 1000,
      courses: [
        {
          courseName: 'Boxen | Sissis Boxers (Fortgeschrittene)',
          trainings: [
            { date: '2024-04-08', compensationCents: 111 },
            { date: '2024-04-07', compensationCents: 222 },
            { date: '2024-04-06', compensationCents: 333 },
            { date: '2024-04-05', compensationCents: 444 },
          ],
        },
        {
          courseName: 'Boxen | Sissis Boxers (Anfänger)',
          trainings: [
            { date: '2024-03-08', compensationCents: 555 },
            { date: '2024-03-07', compensationCents: 666 },
            { date: '2024-03-06', compensationCents: 777 },
            { date: '2024-03-05', compensationCents: 888 },
          ],
        },
      ],
    });
  });
});
