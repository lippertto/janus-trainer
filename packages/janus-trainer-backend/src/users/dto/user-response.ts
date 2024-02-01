import type { Group } from '../user.entity';

export interface UserResponse {
  id: string;
  iban?: string;
  email: string;
  name: string;
  groups: Group[];
}

export class UserListResponse {
  value: UserResponse[];
}
