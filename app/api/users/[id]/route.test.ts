import { UserPatchRequest } from '@/lib/dto';
import { patchRequestToUpdateData } from '@/app/api/users/[id]/route';


describe("user patch", () => {
  test("removes whitespaces when converting request", async () => {
    // GIVEN
    const request = new UserPatchRequest(
      {iban: "a b c", },
    );
    // WHEN
    const result = await patchRequestToUpdateData(request);
    // THEN
    expect(result.iban).not.toMatch(/\s/)
  })
})