import superagent from 'superagent';
import { HolidayCreateRequest, HolidayDto } from '@/lib/dto';

const SERVER = 'http://localhost:3000';

describe('/holidays', () => {
  test('create update delete', async () => {
    let holidayId;
    try {
      const createRequest: HolidayCreateRequest = {
        name: 'Name',
        start: '2024-03-02',
        end: '2024-04-05',
      };

      const createResponse = await superagent
        .post(`${SERVER}/api/holidays`)
        .send(createRequest);
      const holiday = createResponse.body as HolidayDto;
      holidayId = holiday.id;
      expect(holiday.name).toBe('Name');
      expect(holiday.start).toBe('2024-03-02');
      expect(holiday.end).toBe('2024-04-05');

      const updateResponse = await superagent
        .put(`${SERVER}/api/holidays/${holidayId}`)
        .send({ name: 'new-name', start: '2025-03-02', end: '2025-04-08' });
      const updatedHoliday = updateResponse.body as HolidayDto;
      expect(updatedHoliday.name).toBe('new-name');
      expect(updatedHoliday.start).toBe('2025-03-02');
      expect(updatedHoliday.end).toBe('2025-04-08');
    } finally {
      if (holidayId) {
        await superagent.delete(`${SERVER}/api/holidays/${holidayId}`);
      }
    }
  });
});
