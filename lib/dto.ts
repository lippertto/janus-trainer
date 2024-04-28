import { Prisma, TrainingStatus } from '@prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsIBAN,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export enum Group {
  ADMINS = 'admins',
  TRAINERS = 'trainers',
}

export type User = {
  id: string;
  iban: string | null;
  email: string;
  name: string;
  groups: Group[];
};

export type TrainingDtoNew = Prisma.TrainingGetPayload<{
  include: { user: true; discipline: true };
}>;

export class TrainingCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsISO8601()
  date: string;

  disciplineId: number;

  @IsString()
  group: string;

  compensationCents: number;

  participantCount: number;

  @IsString()
  userId: string;
}

export class TrainingUpdateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @Matches(/([0-9]{4})-(0[0-9]|1[012])-([012][0-9]|[3][01])/)
  date: string;

  @IsNumber()
  disciplineId: number;

  @IsString()
  group: string;

  @IsNumber()
  compensationCents: number;

  @IsNumber()
  participantCount: number;
}

export class UserCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsOptional()
  @IsIBAN()
  iban: string | undefined;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(Group, { each: true })
  groups: Group[];
}

export type UserQueryResponseDto = {
  value: User[];
};

export class TrainingUpdateStatusRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsEnum(TrainingStatus)
  status: TrainingStatus;
}

class TrainingBatchOperation {
  @IsNumber()
  id: number;
  @IsString()
  operation: 'SET_COMPENSATED';
}

export class TrainingBatchUpdateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsArray()
  @ValidateNested()
  operations: TrainingBatchOperation[];
}

export type TrainingBatchUpdateReponse = {
  value: ('OK' | ErrorResponse)[];
};

type ErrorDetail = {
  message: string;
  code: string;
};

export type ErrorResponse = {
  error: ErrorDetail;
};

export type CompensationDtoNew = {
  user: {
    id: string;
    name: string;
    iban: string;
  };
  totalCompensationCents: number;
  totalTrainings: number;
  correspondingIds: number[];
  periodStart: string;
  periodEnd: string;
};

export type CompensationQueryResponse = {
  value: CompensationDtoNew[];
};

export type AppUser = {
  name: string;
  firstname: string;
  membershipNumber: string;
};

export class DisciplineCreateRequestDto {
  @IsString()
  name: string;
}
