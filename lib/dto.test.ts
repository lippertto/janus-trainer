import { validateOrThrow } from '@/lib/helpers-for-api';
import { PaymentCreateRequest } from '@/lib/dto';

describe('dto', () => {
  test('rejects empty PaymentCreateRequest', async () => {
    const data = {};
    await expect(async () => {
      await validateOrThrow(new PaymentCreateRequest(data));
    }).rejects.toThrow(Error);
  });

  test('accepts PaymentCreateRequest', async () => {
    const data = {
      userId: "abc",
      trainingIds: [1,2,3]
    };
    const request =      await validateOrThrow(new PaymentCreateRequest(data));
    expect(request.trainingIds).toHaveLength(3)
  });
});