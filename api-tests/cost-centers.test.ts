import superagent from 'superagent';
import { CostCenterDto, CostCenterUpdateRequest } from '@/lib/dto';
import { describe, expect, test } from 'vitest';
import { LocalApi } from './apiTestUtils';
import { SERVER } from './apiTestUtils';

describe('/cost-centers', () => {
  test('CRUD roundtrip', async () => {
    let costCenter;
    try {
      const api = new LocalApi(SERVER);
      costCenter = await api.createCostCenter();

      expect(costCenter.name).toBe('Name');
      expect(costCenter.costCenterId).toBe(666);

      // update
      const updateRequest: CostCenterUpdateRequest = {
        name: 'new-name',
        costCenterId: 777,
      };
      const updateResponse = await superagent
        .put(`${SERVER}/api/cost-centers/${costCenter.id}`)
        .send(updateRequest);

      expect(updateResponse.statusCode).toBe(200);
      const updatedCostCenter = updateResponse.body as CostCenterDto;
      expect(updatedCostCenter.name).toBe('new-name');
      expect(updatedCostCenter.costCenterId).toBe(777);

      // delete
      await superagent.delete(`${SERVER}/api/cost-centers/${costCenter.id}`);
      costCenter = null;
    } finally {
      if (costCenter) {
        await superagent.delete(`${SERVER}/api/cost-centers/${costCenter.id}`);
      }
    }
  });

  test('Cannot delete cost-centers which are still used', async () => {
    let costCenter;
    let course;
    try {
      // GIVEN a cost center with an assigned course
      const api = new LocalApi(SERVER);
      costCenter = await api.createCostCenter();
      course = await api.createCourse({ costCenterId: costCenter.id });

      // WHEN we try to delete the cost center
      let response = await superagent
        .delete(`${SERVER}/api/cost-centers/${costCenter.id}`)
        .ok((res) => res.status === 409);

      // THEN we get a 409 to indicate that the cost center cannot be deleted
      expect(response.statusCode).toBe(409);

      // WHEN we delete that course
      await superagent.delete(`${SERVER}/api/courses/${course.id}`);
      course = null;

      // THEN we are able to delete the cost center
      await superagent.delete(`${SERVER}/api/cost-centers/${costCenter.id}`);
      costCenter = null;
    } finally {
      if (costCenter) {
        await superagent.delete(`${SERVER}/api/cost-centers/${costCenter.id}`);
      }

      if (course) {
        await superagent.delete(`${SERVER}/api/courses/${course.id}`);
      }
    }
  });
});
