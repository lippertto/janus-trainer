import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsIBAN,
  IsOptional,
} from 'class-validator';

import { Group } from './Group';

export class UserCreateRequestDto {
  @IsEmail()
  email: string;

  @IsIBAN()
  @IsOptional()
  iban?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Group, { each: true })
  groups: Group[];
}
