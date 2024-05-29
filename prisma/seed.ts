import prisma from '../lib/prisma';

async function main() {
  const users = [{
    id: '502c79bc-e051-70f5-048c-5619e49e2383',
    name: 'Test-User Admin',
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
      update: {},
    })
  )));

  const disciplines = [
    { id: 1, name: 'Achtsamkeit & Mindfulness' },
    { id: 2, name: 'Feldenkreis' },
    { id: 3, name: 'Pilates' },
    { id: 4, name: 'Yoga' },
    { id: 5, name: 'Tai Chi' },
    { id: 6, name: 'Qi Gong' },
    { id: 7, name: 'Volleyball' },
    { id: 8, name: 'Basketball' },
    { id: 9, name: 'Fußball' },
    { id: 10, name: 'Handball' },
    { id: 11, name: 'Baseball' },
    { id: 12, name: 'Boxen' },
    { id: 13, name: 'Krav Maga' },
    { id: 14, name: 'Taekwondo' },
    { id: 15, name: 'Brazilian Jiu-Jitsu' },
    { id: 16, name: 'Kanu' },
    { id: 17, name: 'Rudern' },
    { id: 18, name: 'Badminton' },
    { id: 19, name: 'Kindersport' },
    { id: 20, name: 'Body Fit' },
    { id: 21, name: 'Bootcamp' },
    { id: 22, name: 'Freestyle Langhanteltraining' },
    { id: 23, name: 'Indoor Cycling' },
    { id: 24, name: 'Fitness & Kondition' },
    { id: 25, name: 'Functional Training' },
    { id: 26, name: 'Kapow' },
    { id: 27, name: 'Frauen Fitness' },
    { id: 28, name: 'Gymnastik/Rostfrei/Ölkännchen' },
    { id: 29, name: 'Ü100' },
    { id: 30, name: 'Wirbelsäulengymnastik' },
    { id: 31, name: 'Boule' },
    { id: 32, name: 'Tennis' },
    { id: 33, name: 'Tischtennis' },
    { id: 34, name: 'Cheerleading' },
    { id: 35, name: 'Leichtathletik' },
    { id: 36, name: 'Laufen' },
    { id: 37, name: 'Aquafitness' },
    { id: 38, name: 'Schwimmen' },
  ];

  await Promise.all(disciplines.map(async (d) => {
    await prisma.discipline.upsert({
      where: { id: d.id },
      create: d,
      update: {},
    });
  }));


  const compensationValues = [{ id: 1, cents: 2000, description: 'klein' },
    { id: 2, cents: 3000, description: 'groß' },
  ];

  await Promise.all(compensationValues.map(async (d) => {
    await prisma.compensationValue.upsert({
      where: { id: d.id },
      create: d,
      update: {},
    });
  }));
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
