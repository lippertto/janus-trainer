import { describe, expect, test } from 'vitest';
import superagent from 'superagent';
import { CourseDto } from '@/lib/dto';
import { LocalApi } from './apiTestUtils';

const SERVER = 'http://localhost:3000';

async function deleteCostCenter(id: number) {
  await superagent.delete(`${SERVER}/api/cost-centers/${id}`);
}

async function deleteCourse(id: number) {
  await superagent.delete(`${SERVER}/api/courses/${id}`);
}

async function getAllCourses(): Promise<CourseDto[]> {
  const result = await superagent.get(`${SERVER}/api/courses`);
  return result.body.value as CourseDto[];
}

describe('/courses', () => {
  test('courses are not returned when deleted', async () => {
    const courseCountBefore = (await getAllCourses()).length;

    let costCenter;
    let course1, course2;
    try {
      const api = new LocalApi(SERVER);
      costCenter = await api.createCostCenter();

      course1 = await api.createCourse({ costCenterId: costCenter.id });
      course2 = await api.createCourse({ costCenterId: costCenter.id });

      const courseCountAfterAdding = (await getAllCourses()).length;
      expect(courseCountAfterAdding).toBe(courseCountBefore + 2);

      await deleteCourse(course1.id);
      course1 = null;
      const courseCountAfterDeletion = (await getAllCourses()).length;
      expect(courseCountAfterDeletion).toBe(courseCountAfterAdding - 1);
    } finally {
      if (course1) {
        await deleteCourse(course1.id);
      }
      if (course2) {
        await deleteCourse(course2.id);
      }
      if (costCenter) {
        await deleteCostCenter(costCenter.id);
      }
    }
  });

  test('deleted course is not returned', async () => {
    let costCenter;
    let course;
    try {
      const api = new LocalApi(SERVER);
      costCenter = await api.createCostCenter();

      course = await api.createCourse({ costCenterId: costCenter.id });

      await deleteCourse(course.id);
      const courseResponse = await superagent
        .get(`${SERVER}/api/courses/${course.id}`)
        .ok((res) => res.status === 404);
      expect(courseResponse.statusCode).toBe(404);
    } finally {
      if (costCenter) {
        await deleteCostCenter(costCenter.id);
      }
      if (course) {
        await deleteCourse(course.id);
      }
    }
  });
});
