import superagent from 'superagent';
import {
  CompensationClassCreateRequest,
  CompensationClassDto,
} from '@/lib/dto';
import { v4 as uuidv4 } from 'uuid';
import { describe, expect, test } from 'vitest';

const SERVER = 'http://localhost:3000';

describe('/compensation-classes', () => {
  test('created entities can be retrieved', async () => {
    const name = uuidv4();
    const createRequest: CompensationClassCreateRequest = {
      name,
    };

    const createResponse = await superagent
      .post(`${SERVER}/api/compensation-classes`)
      .send(createRequest);
    const createdClass = createResponse.body as CompensationClassDto;
    expect(createdClass.name).toBe(name);

    const findResponse = await superagent.get(
      `${SERVER}/api/compensation-classes`,
    );
    const foundClasses = findResponse.body.value as CompensationClassDto[];

    expect(foundClasses).toContainEqual(createdClass);

    // clean up
    const deleteResponse = await superagent.delete(
      `${SERVER}/api/compensation-classes/${createdClass.id}`,
    );
    expect(deleteResponse.statusCode).toBe(204);
  });

  test('contains compensation values if requested', async () => {
    const compensationClassName = uuidv4();
    const compensationValueName1 = uuidv4();
    const compensationValueName2 = uuidv4();

    // create compensation class
    const createResponse = await superagent
      .post(`${SERVER}/api/compensation-classes`)
      .send({
        name: compensationClassName,
      });
    const createdClass = createResponse.body as CompensationClassDto;
    expect(createdClass.name).toBe(compensationClassName);

    // list compensation classes
    const findResponse = await superagent.get(
      `${SERVER}/api/compensation-classes?expand=compensationValues`,
    );
    const foundClasses = findResponse.body.value as CompensationClassDto[];

    expect(foundClasses).toContainEqual({
      ...createdClass,
      compensationValues: [],
    });

    // create compensation values
    const createValueResponse1 = await superagent
      .post(
        `${SERVER}/api/compensation-classes/${createdClass.id}/compensation-values`,
      )
      .send({ description: compensationValueName1, cents: 100 });
    expect(createValueResponse1.body.description).toBe(compensationValueName1);
    const createValueResponse2 = await superagent
      .post(
        `${SERVER}/api/compensation-classes/${createdClass.id}/compensation-values`,
      )
      .send({ description: compensationValueName2, cents: 200 });
    expect(createValueResponse2.body.description).toBe(compensationValueName2);

    // check compensation values
    const cvResponse1 = await superagent.get(
      `${SERVER}/api/compensation-classes/${createdClass.id}/compensation-values/${createValueResponse1.body.id}`,
    );
    expect(cvResponse1.statusCode).toBe(200);
    const cvResponse2 = await superagent.get(
      `${SERVER}/api/compensation-classes/${createdClass.id}/compensation-values/${createValueResponse2.body.id}`,
    );
    expect(cvResponse2.statusCode).toBe(200);

    // check if the values are returned with the classes
    const ccResponse = await superagent.get(
      `${SERVER}/api/compensation-classes/${createdClass.id}?expand=compensationValues`,
    );
    expect(ccResponse.statusCode).toBe(200);
    expect(ccResponse.body.compensationValues).toHaveLength(2);

    // delete compensation class
    const deleteResponse = await superagent.delete(
      `${SERVER}/api/compensation-classes/${createdClass.id}`,
    );
    expect(deleteResponse.statusCode).toBe(204);

    // check compensation values
    const cvResponse1again = await superagent
      .get(
        `${SERVER}/api/compensation-classes/${createdClass.id}/compensation-values/${createValueResponse1.body.id}`,
      )
      .ok((res) => res.status === 404);
    expect(cvResponse1again.statusCode).toBe(404);
    const cvResponse2again = await superagent
      .get(
        `${SERVER}/api/compensation-classes/${createdClass.id}/compensation-values/${createValueResponse2.body.id}`,
      )
      .ok((res) => res.status === 404);
    expect(cvResponse2again.statusCode).toBe(404);
  });
});
