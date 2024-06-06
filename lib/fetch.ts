import { CompensationValueQueryResponse } from '@/lib/dto';
import { bigIntReviver } from '@/lib/json-tools';
import { Discipline } from '@prisma/client';

type JanusList<T> = {
  value: T[];
}

/**
 * Use this function to query the API for anything that returns a list of
 * entities. This method will return a rejected promise on error.
 */
export async function fetchListFromApi<T>(
  route: string,
  accessToken: string,
): Promise<T[]> {
  try {
    const response = await fetch(route, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status !== 200) {
      return Promise.reject(
        new Error(`Failed to get data from ${route}. Error is: ${await response.text()}`),
      );
    }
    const result = await response.text();
    const parsedResult = JSON.parse(result, bigIntReviver) as JanusList<T>;
    return parsedResult.value;
  } catch (e) {
    return Promise.reject(
      new Error(`Unexpected error while getting data from ${route}: ${JSON.stringify(e)}`)
    )
  }
}

/** Will return the deleted object for confirmation messages, etc. */
export async function deleteFromApi<T extends {id: number|string}>(
  route: string,
  entity: T,
  accessToken: string,
): Promise<T> {
  try {
    const response = await fetch(`${route}/${entity.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      method: 'DELETE',
    });
    if (response.status !== 204) {
      return Promise.reject(
        new Error(`Failed to get delete ${entity.id} from ${route}. Error is: ${await response.text()}`),
      );
    }
    return entity;
  } catch (e) {
    return Promise.reject(
      new Error(`Unexpected error while deleting ${entity.id} from ${route}: ${JSON.stringify(e)}`)
    )
  }
}

export async function createInApi<T>(
  route: string,
  data: any,
  accessToken: string
) {
  const response = await fetch(route, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (response.status != 201) {
    return Promise.reject(
      new Error(`Failed to create new entity via ${route}`)
    )
  }
  return await response.json() as T;
}

export async function updateInApi<T>(
  route: string,
  id: string|number,
  data: any,
  accessToken: string
) {
  const response = await fetch(`${route}/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (response.status != 200) {
    return Promise.reject(
      new Error(`Failed to update entity via ${route}`)
    )
  }
  return await response.json() as T;
}