import { UserPatchRequest } from '@/lib/dto';

export async function patchRequestToUpdateData(request: UserPatchRequest) {
  let data: any  = {};
  if (request.iban) {
    data['iban'] = request.iban.replace(/\s/g, "");
  }
  if (request.termsAcceptedVersion) {
    data['termsAcceptedVersion'] = request.termsAcceptedVersion;
    data['termsAcceptedAt'] = new Date();
  }
  return data;
}
