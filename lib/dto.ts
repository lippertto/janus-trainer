import { CompensationValue, Course, DayOfWeek, Discipline, Holiday, Training, TrainingStatus } from '@prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsIBAN,
  IsInt,
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

export type UserDto = {
  id: string;
  iban: string | null;
  email: string;
  name: string;
  groups: Group[];
};

export type TrainingDto = Training & {
  user: UserDto,
  course: CourseDto,
}

export class TrainingCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsISO8601()
  date: string;

  disciplineId: number;

  @IsNumber()
  courseId: number;

  @IsNumber()
  compensationCents: number;

  @IsNumber()
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
  courseId: number;

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

export class UserUpdateRequest extends UserCreateRequest {
}

export type UserQueryResponseDto = {
  value: UserDto[];
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

export type CompensationDto = {
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
  value: CompensationDto[];
};

export type AppUser = {
  name: string;
  firstname: string;
  membershipNumber: string;
};

export class DisciplineCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsString()
  name: string;
}

export type DisciplineDto = Discipline;

export class DisciplineUpdateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsString()
  name: string;
}

export type CompensationValueDto = CompensationValue;

export class CompensationValueCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsInt()
  cents: number;

  @IsString()
  description: string;
}

export type CompensationValueQueryResponse = {
  value: CompensationValueDto[]
}

export class CourseCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsString()
  name: string;

  @IsInt()
  durationMinutes: number;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  weekdays: DayOfWeek[];

  @IsInt()
  startHour: number;

  @IsInt()
  startMinute: number;

  @IsArray()
  @IsString({ each: true })
  trainerIds: string[];

  @IsArray()
  @IsInt({ each: true })
  allowedCompensationIds: number[];

  @IsNumber()
  disciplineId: number;
}

export type CourseQueryResponse = {
  value: CourseDto[];
}

export type CourseDto = Course & {
  trainers: { name: string, id: string }[]
  allowedCompensations: CompensationValueLightDto[]
}

export class CourseUpdateRequest extends CourseCreateRequest {
}

export function dayOfWeekToHumanReadable(w: DayOfWeek) {
  switch (w) {
    case 'MONDAY':
      return 'Montag';
    case 'TUESDAY':
      return 'Dienstag';
    case 'WEDNESDAY':
      return 'Mittwoch';
    case 'THURSDAY':
      return 'Donnerstag';
    case 'FRIDAY':
      return 'Freitag';
    case 'SATURDAY':
      return 'Samstag';
    case 'SUNDAY':
      return 'Sunday';
  }
}

export type CompensationValueLightDto = Pick<CompensationValueDto, 'id' | 'description' | 'cents'>;

export type HolidayDto = Holiday;