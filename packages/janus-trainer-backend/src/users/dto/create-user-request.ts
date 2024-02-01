import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsIBAN,
  IsOptional,
} from 'class-validator';
import { Group } from '../user.entity';

export class CreateUserRequest {
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
