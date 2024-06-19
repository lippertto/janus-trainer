import prisma from '../lib/prisma';
import { CompensationGroup, DayOfWeek } from '@prisma/client';

async function resetIdCounter(tableName: string) {
  return prisma.$queryRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('"public"."${tableName}"', 'id')
                 , COALESCE(max(id) + 1, 1)
                 , false)
      FROM "public"."${tableName}";
  `);
}

async function main() {
  const users = [
    {
      id: '502c79bc-e051-70f5-048c-5619e49e2383',
      name: 'Test-User Admin',
      compensationGroups: [CompensationGroup.NO_QUALIFICATION],
    },
    {
      id: '80ac598c-e0b1-7040-5e0e-6fd257a53699',
      name: 'Test-User Trainer',
      iban: 'DE53500105175739486428',
    },
  ];

  await Promise.all(users.map((u) => (
    prisma.userInDb.upsert({
      where: { id: u.id },
      create: u,
      update: u,
    })
  )));

  const compensationValues = [
    {
      cents: 1000,
      description: 'Zehner (NQ)',
      durationMinutes: 60,
      compensationGroup: CompensationGroup.NO_QUALIFICATION,
    },
    {
      cents: 2000,
      description: 'Zwanni (NQ)',
      durationMinutes: 120,
      compensationGroup: CompensationGroup.NO_QUALIFICATION,
    },
    {
      cents: 3100,
      description: 'Einunddreißig(MQ)',
      durationMinutes: 60,
      compensationGroup: CompensationGroup.WITH_QUALIFICATION,
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

  const course = {
    name: 'Test-Kurs',
    weekdays: [DayOfWeek.TUESDAY],
    startHour: 19,
    startMinute: 0,
    durationMinutes: 90,
  };

  await prisma.course.upsert({
    where: { id: 1 },
    create: course,
    update: course,
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
