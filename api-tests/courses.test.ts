import { describe, expect, test } from 'vitest';
import superagent from 'superagent';
import { CourseDto } from '@/lib/dto';
import { LocalApi } from './apiTestUtils';

const SERVER = 'http://localhost:3000';

async function deleteDiscipline(id: number) {
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
  test('courses are not in returned when deleted', async () => {
    const courseCountBefore = (await getAllCourses()).length;

    let discipline;
    let course1, course2;
    try {
      const api = new LocalApi(SERVER);
      discipline = await api.createCostCenter();

      course1 = await api.createCourse({ costCenterId: discipline.id });
      course2 = await api.createCourse({ costCenterId: discipline.id });

      const courseCountPlus2 = (await getAllCourses()).length;
      expect(courseCountPlus2).toBe(courseCountBefore + 2);

      await deleteCourse(course1.id);
      course1 = null;
      const courseCountAfterDeletion = (await getAllCourses()).length;
      expect(courseCountAfterDeletion).toBe(courseCountPlus2 - 1);
    } finally {
      if (discipline) {
        await deleteDiscipline(discipline.id);
      }
      if (course1) {
        await deleteCourse(course1.id);
      }
      if (course2) {
        await deleteCourse(course2.id);
      }
    }
  });

  test('deleted course is not returned', async () => {
    let discipline;
    let course;
    try {
      const api = new LocalApi(SERVER);
      discipline = await api.createCostCenter();

      course = await api.createCourse({ costCenterId: discipline.id });

      await deleteCourse(course.id);
      const courseResponse = await superagent
        .get(`${SERVER}/api/courses/${course.id}`)
        .ok((res) => res.status === 404);
      expect(courseResponse.statusCode).toBe(404);
    } finally {
      if (discipline) {
        await deleteDiscipline(discipline.id);
      }
      if (course) {
        await deleteCourse(course.id);
      }
    }
  });
});
