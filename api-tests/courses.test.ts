import { describe, expect, test } from 'vitest';
import superagent from 'superagent';
import {
  CourseCreateRequest,
  CourseDto,
  DisciplineCreateRequest,
  DisciplineDto,
} from '@/lib/dto';
import { DayOfWeek } from '@prisma/client';

const SERVER = 'http://localhost:3000';

async function createCourse(disciplineId: number): Promise<CourseDto> {
  const result = await superagent.post(`${SERVER}/api/courses`).send({
    name: 'any-course',
    durationMinutes: 120,
    weekday: DayOfWeek.TUESDAY,
    startHour: 10,
    startMinute: 0,
    trainerIds: [],
    disciplineId,
  });
  return result.body as CourseDto;
}

async function createDiscipline(): Promise<DisciplineDto> {
  const createRequest: DisciplineCreateRequest = {
    name: 'Name',
    costCenterId: 666,
  };

  const createResponse = await superagent
    .post(`${SERVER}/api/disciplines`)
    .send(createRequest);
  return createResponse.body as DisciplineDto;
}

async function deleteDiscipline(id: number) {
  await superagent.delete(`${SERVER}/api/disciplines/${id}`);
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
      discipline = await createDiscipline();

      course1 = await createCourse(discipline.id);
      course2 = await createCourse(discipline.id);

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
      discipline = await createDiscipline();

      course = await createCourse(discipline.id);

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
