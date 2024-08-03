import { UserPatchRequest } from '@/lib/dto';
import { patchRequestToUpdateData } from './patch';


describe("user patch", () => {
  test("removes whitespaces when converting request", () => {
    // GIVEN
    const request = new UserPatchRequest(
      {iban: "a b c", },
    );
    // WHEN
    const result = patchRequestToUpdateData(request);
    // THEN
    expect(result.iban).not.toMatch(/\s/)
  })
})