import { CompensationValue } from '@prisma/client';
import { CompensationValueCreateRequest, CompensationValueQueryResponse } from '@/lib/dto';

export async function getCompensationValues(
  accessToken: string,
): Promise<CompensationValue[]> {
  try {
    const response = await fetch(`/api/compensation-values`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status !== 200) {
      return Promise.reject(
        new Error(`Failed to get compensation values: ${await response.text()}`),
      );
    }
    const result = await response.json() as CompensationValueQueryResponse;
    return result.value;
  } catch (e) {
    console.log(JSON.stringify(e));
    throw e;
  }
}

export async function addCompensationValue(accessToken: string, cents: number, description: string) {
  const request: CompensationValueCreateRequest = {cents, description}

  try {
    const response = await fetch(`/api/compensation-values`, {
      headers: { Authorization: `Bearer ${accessToken}` },

      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.status !== 201) {
      return Promise.reject(
        new Error(`Failed to add compensation value: ${await response.text()}`),
      );
    }
    return await response.json() as CompensationValue;
  } catch (e) {
    console.log(JSON.stringify(e));
    throw e;
  }
}

export async function deleteCompensationValue(accessToken: string, id: number): Promise<void> {
  try {
    const response = await fetch(`/api/compensation-values/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      method: 'DELETE',
    });

    if (response.status !== 204) {
      return Promise.reject(
        new Error(`Failed to delete compensation values: ${await response.text()}`),
      );
    }
  } catch (e) {
    console.log(JSON.stringify(e));
    throw e;
  }
}