import { describe, expect, test } from 'vitest';
import superagent from 'superagent';
import { SERVER } from './apiTestUtils';
import { ConfigurationValueDto } from '@/lib/dto';

const SOME_CONFIG_KEY = 'max-courses-per-year';

describe('/configuration', () => {
  test('Gets all configuration values', async () => {
    const response = await superagent.get(`${SERVER}/api/configuration`);
    expect(response.statusCode).toBe(200);
    const configValues = response.body.value as ConfigurationValueDto[];
    expect(configValues).toContainEqual(
      expect.objectContaining({ key: SOME_CONFIG_KEY }),
    );
  });

  test('Config value roundtrip', async () => {
    const newValue = '100';

    const response = await superagent
      .put(`${SERVER}/api/configuration/${SOME_CONFIG_KEY}`)
      .send({ value: newValue });
    expect(response.statusCode).toBe(200);
    expect(response.body.key).toBe(SOME_CONFIG_KEY);
    expect(response.body.value).toBe(newValue);

    const queriedValue = await superagent.get(
      `${SERVER}/api/configuration/${SOME_CONFIG_KEY}`,
    );
    expect(queriedValue.body.key).toBe(SOME_CONFIG_KEY);
    expect(queriedValue.body.value).toBe(newValue);

    await superagent.delete(`${SERVER}/api/configuration/${SOME_CONFIG_KEY}`);
    const afterDeletion = await superagent.get(
      `${SERVER}/api/configuration/${SOME_CONFIG_KEY}`,
    );
    expect(afterDeletion.body.key).toBe(SOME_CONFIG_KEY);
    expect(afterDeletion.body.value).not.toBe(newValue);
  });

  test('handles non-existing configuration values', async () => {
    const response = await superagent
      .put(`${SERVER}/api/configuration/miau`)
      .send({ value: 'abc' })
      .ok((res) => res.status === 404);
    expect(response.statusCode).toBe(404);
  });

  test('handles bad configuration values', async () => {
    const response = await superagent
      .put(`${SERVER}/api/configuration/${SOME_CONFIG_KEY}`)
      .send({ value: 'abc' }) // allows only integers
      .ok((res) => res.status === 400);
    expect(response.statusCode).toBe(400);
  });
});
