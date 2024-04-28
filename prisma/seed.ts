import prisma from '../lib/prisma';

async function main() {
  await prisma.userInDb.createMany({data:[
    {id: "502c79bc-e051-70f5-048c-5619e49e2383", name: "Test-User Admin"},
    {id: "80ac598c-e0b1-7040-5e0e-6fd257a53699", name: "Test-User Trainer", iban: "DE53500105175739486428"}
  ]});

  await prisma.discipline.createMany({
    data: [
      { name: 'Achtsamkeit & Mindfulness' },
      { name: 'Feldenkreis' },
      { name: 'Pilates' },
      { name: 'Yoga' },
      { name: 'Tai Chi' },
      { name: 'Qi Gong' },
      { name: 'Volleyball' },
      { name: 'Basketball' },
      { name: 'Fußball' },
      { name: 'Handball' },
      { name: 'Baseball' },
      { name: 'Boxen' },
      { name: 'Krav Maga' },
      { name: 'Taekwondo' },
      { name: 'Brazilian Jiu-Jitsu' },
      { name: 'Kanu' },
      { name: 'Rudern' },
      { name: 'Badminton' },
      { name: 'Kindersport' },
      { name: 'Body Fit' },
      { name: 'Bootcamp' },
      { name: 'Freestyle Langhanteltraining' },
      { name: 'Indoor Cycling' },
      { name: 'Fitness & Kondition' },
      { name: 'Functional Training' },
      { name: 'Kapow' },
      { name: 'Frauen Fitness' },
      { name: 'Gymnastik/Rostfrei/Ölkännchen' },
      { name: 'Ü100' },
      { name: 'Wirbelsäulengymnastik' },
      { name: 'Boule' },
      { name: 'Tennis' },
      { name: 'Tischtennis' },
      { name: 'Cheerleading' },
      { name: 'Leichtathletik' },
      { name: 'Laufen' },
      { name: 'Aquafitness' },
      { name: 'Schwimmen' },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
