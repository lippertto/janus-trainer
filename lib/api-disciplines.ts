import { Discipline } from '@prisma/client';
import { DisciplineCreateRequest } from '@/lib/dto';

export async function addDiscipline(
  accessToken: string,
  name: string,
): Promise<Discipline> {
  const request: DisciplineCreateRequest = {
    name,
  };
  const response = await fetch(`/api/disciplines`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(request),
  });
  const result = (await response.json());
  return result as Discipline;
}

export async function deleteDiscipline(
  accessToken: string,
  id: string | number,
): Promise<void> {
  await fetch(`/api/disciplines/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: 'DELETE',
  });
}

export async function getDisciplines(
  accessToken: string,
): Promise<Discipline[]> {
  try {
    const response = await fetch(`/api/disciplines`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status !== 200) {
      return Promise.reject(
        new Error(`Failed to get disciplines: ${await response.text()}`),
      );
    }
    const result = (await response.json()).value;
    return result as Discipline[];
  } catch (e) {
    console.log(JSON.stringify(e));
    throw e;
  }
}

