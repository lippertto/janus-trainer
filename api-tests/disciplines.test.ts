import superagent from 'superagent';
import {
  CompensationClassDto,
  CourseDto,
  DisciplineCreateRequest,
  DisciplineDto,
} from '@/lib/dto';
import prisma from '@/lib/prisma';

const SERVER = 'http://localhost:3000';

describe('/disciplines', () => {
  test('Creates a custom course for the discipline', async () => {
    const createRequest: DisciplineCreateRequest = {
      name: 'Name',
      costCenterId: 666,
    };

    const createResponse = await superagent
      .post(`${SERVER}/api/disciplines`)
      .send(createRequest);
    const createdDiscipline = createResponse.body as DisciplineDto;
    expect(createdDiscipline.name).toBe('Name');
    expect(createdDiscipline.costCenterId).toBe(666);

    const getCourseResponse = await superagent.get(
      `${SERVER}/api/courses?custom=true&costCenterId=${createdDiscipline.id}`,
    );
    expect(getCourseResponse.body.value).toHaveLength(1);
    const customCourse = getCourseResponse.body.value[0] as CourseDto;
    expect(customCourse.isCustomCourse).toBe(true);

    await superagent.delete(
      `${SERVER}/api/disciplines/${createdDiscipline.id}`,
    );
    await superagent.delete(`${SERVER}/api/courses/${customCourse.id}`);
  });
});
