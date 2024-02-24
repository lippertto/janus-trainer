import { DisciplineCreateRequestDto, DisciplineDto } from 'janus-trainer-dto';

export async function addDiscipline(
  accessToken: string,
  name: string,
): Promise<DisciplineDto> {
  const request: DisciplineCreateRequestDto = {
    name,
  };
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/disciplines`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },

      method: 'POST',
      body: JSON.stringify(request),
    },
  );
  const result = (await response.json()).value;
  return result as DisciplineDto;
}

export async function deleteDiscipline(
  accessToken: string,
  id: string,
): Promise<void> {
  await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/disciplines/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: 'DELETE',
  });
}

export async function getDisciplines(
  accessToken: string,
): Promise<DisciplineDto[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/disciplines`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (response.status !== 200) {
    return Promise.reject(
      new Error(`Failed to get disciplines: ${await response.text()}`),
    );
  }
  const result = (await response.json()).value;
  return result as DisciplineDto[];
}
