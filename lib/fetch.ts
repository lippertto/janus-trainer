import { CompensationValueQueryResponse } from '@/lib/dto';
import { bigIntReviver } from '@/lib/json-tools';

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