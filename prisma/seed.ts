import prisma from '../lib/prisma';
import { DayOfWeek, Discipline } from '@prisma/client';

async function resetIdCounter(tableName: string) {
  return prisma.$queryRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"public"."${tableName}"', 'id')
                 , COALESCE(max(id) + 1, 1)
                 , false)
      FROM "public"."${tableName}";
  `);
}

async function main() {
  const compensationClass = {
    name: 'Keine Quali',
    id: 1,
  };
  await prisma.compensationClass.upsert({
    where: { id: compensationClass.id },
    create: compensationClass,
    update: compensationClass,
  });
  await resetIdCounter('CompensationClass');

  const compensationValues = [
    {
      cents: 1000,
      description: 'Zehner (NQ)',
      durationMinutes: 60,
      compensationClass: { connect: { id: 1 } },
    },
    {
      cents: 2000,
      description: 'Zwanni (NQ)',
      durationMinutes: 120,
      compensationClass: { connect: { id: 1 } },
    },
    {
      cents: 3100,
      description: 'Einunddreißig(NQ)',
      durationMinutes: 60,
      compensationClass: { connect: { id: 1 } },
    },
  ];

  for (let i = 0; i < compensationValues.length; i++) {
    await prisma.compensationValue.upsert({
      where: { id: i },
      create: compensationValues[i],
      update: compensationValues[i],
    });
  }
  await resetIdCounter('CompensationValue');

  const users = [
    {
      id: '502c79bc-e051-70f5-048c-5619e49e2383',
      name: 'Test-User Admin',
      termsAcceptedVersion: '2024-08-03',
      compensationClasses: { connect: { id: 1 } },
    },
    {
      id: '80ac598c-e0b1-7040-5e0e-6fd257a53699',
      name: 'Test-User Trainer',
      iban: 'DE53500105175739486428',
      termsAcceptedVersion: '2024-08-03',
      compensationClasses: { connect: { id: 1 } },
    },
  ];

  await Promise.all(
    users.map((u) =>
      prisma.userInDb.upsert({
        where: { id: u.id },
        create: u,
        update: u,
      }),
    ),
  );

  const discipline1: Discipline = {
    name: 'Sportart 1',
    id: 1,
    costCenterId: 42,
    deletedAt: null,
  };
  const discipline2: Discipline = {
    name: 'Sportart 2',
    id: 2,
    costCenterId: 84,
    deletedAt: null,
  };

  await Promise.all(
    [discipline1, discipline2].map((d) =>
      prisma.discipline.upsert({
        where: { id: d.id },
        create: d,
        update: d,
      }),
    ),
  );
  await resetIdCounter('Discipline');

  const course1 = {
    name: 'Test-Kurs 1',
    weekday: DayOfWeek.TUESDAY,
    startHour: 19,
    startMinute: 0,
    durationMinutes: 90,
    disciplineId: discipline1.id,
  };

  const course2 = {
    name: 'Test-Kurs 2',
    weekday: DayOfWeek.WEDNESDAY,
    startHour: 19,
    startMinute: 0,
    durationMinutes: 120,
    disciplineId: discipline2.id,
  };

  await prisma.course.upsert({
    where: { id: 1 },
    create: {
      ...course1,
      trainers: { connect: { id: '80ac598c-e0b1-7040-5e0e-6fd257a53699' } },
    },
    update: {
      ...course1,
      trainers: { set: { id: '80ac598c-e0b1-7040-5e0e-6fd257a53699' } },
    },
  });

  await prisma.course.upsert({
    where: { id: 2 },
    create: {
      ...course2,
      trainers: { connect: { id: '80ac598c-e0b1-7040-5e0e-6fd257a53699' } },
    },
    update: {
      ...course2,
      trainers: { set: { id: '80ac598c-e0b1-7040-5e0e-6fd257a53699' } },
    },
  });

  await resetIdCounter('Course');
}

await main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
