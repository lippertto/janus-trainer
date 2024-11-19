import superagent from 'superagent';
import { DisciplineCreateRequest, DisciplineDto } from '@/lib/dto';
import { describe, expect, test } from 'vitest';

const SERVER = 'http://localhost:3000';

describe('/disciplines', () => {
  test('smoke test create', async () => {
    let disciplineId;
    try {
      const createRequest: DisciplineCreateRequest = {
        name: 'Name',
        costCenterId: 666,
      };

      const createResponse = await superagent
        .post(`${SERVER}/api/disciplines`)
        .send(createRequest);
      const createdDiscipline = createResponse.body as DisciplineDto;
      disciplineId = createdDiscipline.id;
      expect(createdDiscipline.name).toBe('Name');
      expect(createdDiscipline.costCenterId).toBe(666);
    } finally {
      if (disciplineId) {
        await superagent.delete(`${SERVER}/api/disciplines/${disciplineId}`);
      }
    }
  });
});
