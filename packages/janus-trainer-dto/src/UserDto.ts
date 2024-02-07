import { type Group } from './Group';

export type UserDto = {
  id: string;
  iban?: string;
  email: string;
  name: string;
  groups: Group[];
};

export type UserListDto = {
  value: UserDto[];
};
