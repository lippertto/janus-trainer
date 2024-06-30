import superagent from 'superagent';
import { Group, TrainingCreateRequest } from '@/lib/dto';


const SERVER = 'http://localhost:3000'

function jwtLikeString(groups: Group[]) {
// return "eyJraWQiOiJaMzZEdkl4VmU1dCtVeVRqMnpPbnZcL2RYUjAzRnNxVHJPSHF5bVZud3BMUT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI1MDJjNzliYy1lMDUxLTcwZjUtMDQ4Yy01NjE5ZTQ5ZTIzODMiLCJjb2duaXRvOmdyb3VwcyI6WyJ0cmFpbmVycyIsImFkbWlucyJdLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtbm9ydGgtMS5hbWF6b25hd3MuY29tXC9ldS1ub3J0aC0xX2xFMkYwc0x6VCIsInZlcnNpb24iOjIsImNsaWVudF9pZCI6IjFlZnBxdTc1MHY4cmhtbWI4ZHU3Z3NzNGs1Iiwib3JpZ2luX2p0aSI6ImFhYWQ4NjhkLTgwYTUtNDY1MS1hMmNjLWZmMTNiZTk4ZGY0ZSIsImV2ZW50X2lkIjoiMDNkOWU4YWItMTJjYS00YTc1LWFmZjQtYTJhNmY3NTc2YmNhIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJvcGVuaWQiLCJhdXRoX3RpbWUiOjE3MTg1NDQ1NDYsImV4cCI6MTcxODU0ODE0NiwiaWF0IjoxNzE4NTQ0NTQ2LCJqdGkiOiI0NWI4YzYzZC00MTRkLTQ0YmYtYTZlMC1iZWZkYWM0OTI4ZDYiLCJ1c2VybmFtZSI6IjUwMmM3OWJjLWUwNTEtNzBmNS0wNDhjLTU2MTllNDllMjM4MyJ9.C09rG_wrantt1uGm6w4lIFU7fhz6uhHaBVK4BUldrq8osJ3_YE-nHAE5oXlsrzLr6K5qV2LEyU0NBRL6b3pXKwBeCpXA_nFqDw1gDBFlPle0lr4Cx99DX5iDAKxtRJUeARsTRZaGZyyORoEPgpDvQkziQnvs50W-IFmW0GVNelSExauFRyx9h1bmj6YVWRGuUvl4nq5d_pQhOvu1u9KVwjy4wjhfAf3JaKLWj3s-b7pOS265gDtioRLTr4TytVyHbbtmu-yeoOdOR0uEomlo2m3KqOQ58id4kJTWHAbxneP-SqYIUSq-NfE5g3Up8cl1XL3e2QdYkNLInINWb-X_9g"
  const payload = {
    "sub": "sub-value",
    "cognito:groups": groups,
  }
  const encodedPayload = btoa(JSON.stringify(payload))
  return `abc.${encodedPayload}.abc`
}


describe("/compensations:summarize", () => {
  test("happy case", async () => {
    // GIVEN
    const trainerId1 = '502c79bc-e051-70f5-048c-5619e49e2383';
    const trainerId2 = '80ac598c-e0b1-7040-5e0e-6fd257a53699';
    const courseId = 1;
    const trainings: TrainingCreateRequest[] = [
      {date: '2000-12-31', userId: trainerId1, participantCount: 5, compensationCents: 1000, courseId: courseId},
      {date: '2001-01-15', userId: trainerId1, participantCount: 5, compensationCents: 1000, courseId: courseId},
      {date: '2001-02-15', userId: trainerId2, participantCount: 5, compensationCents: 1000, courseId: courseId},
      {date: '2001-03-15', userId: trainerId1, participantCount: 5, compensationCents: 1000, courseId: courseId},
      {date: '2001-04-01', userId: trainerId2, participantCount: 5, compensationCents: 1000, courseId: courseId},
    ];
    const trainingIds = await Promise.all(
      trainings.map(async (t) => {
        const result = await superagent
          .post(`${SERVER}/api/trainings`)
          .set('Authorization', 'Bearer ' + jwtLikeString([]))
          .send(t);
        return result.body.id as number
      }));

    try {
      // WHEN
      const result = await superagent
        .post(`${SERVER}/api/trainings:summarize?startDate=2001-01-01&endDate=2001-03-31`);

      // THEN
      expect(result.body).toHaveProperty('value');
      expect(result.body.value).toHaveLength(2);
      expect(result.body.value).toContainEqual(
        { trainerId: trainerId1, trainerName: "Test-User Admin", newTrainingCount: 2 }
      );
      expect(result.body.value).toContainEqual(
        { trainerId: trainerId2, trainerName: "Test-User Trainer", newTrainingCount: 1 }
      );
    } finally {
      // clean up
      await Promise.all(trainingIds.map((t) => {
        superagent.delete(`${SERVER}/api/trainings/${t}`)
      }));
    }
  })

  test("start and end dates have to be provided", async () => {
    let caught = false;
    // WHEN
    const result2 = await superagent
      .post(`${SERVER}/api/trainings:summarize?startDate=2001-01-01`)
      .catch((e)=> {caught = true})
    ;
    // THEN
    expect(caught).toBe(true);
  })

  test("end date has to be set", async () => {
    let caught = false;
    // WHEN
    const result2 = await superagent
      .post(`${SERVER}/api/trainings:summarize?endDate=2001-01-01`)
      .catch((e)=> {caught = true})
    ;
    // THEN
    expect(caught).toBe(true);
  })
})