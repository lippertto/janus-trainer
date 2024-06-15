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
