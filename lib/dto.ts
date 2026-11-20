import { Course, Training } from '@/generated/prisma/browser';
import { DayOfWeek, TrainingStatus } from '@/generated/prisma/enums';
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
  /** The compensation classes for this user. This will only be returned if explicitly requested. */
  compensationClasses?: CompensationClassDto[];

  termsAcceptedAt: string | null;
  termsAcceptedVersion: string | null;
};

export type TrainerLight = Pick<UserDto, 'name' | 'id'>;

export type TrainingDto = Omit<
  Training,
  'approvedAt' | 'compensatedAt' | 'createdAt'
> & {
  user?: TrainerLight;
  course?: CourseDto;
  approvedAt?: string;
  compensatedAt?: string;
};

export type TrainingQueryResponse = {
  value: TrainingDto[];
};

export class TrainingCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsISO8601()
  date: string;

  @IsNumber()
  courseId: number;

  @IsNumber()
  compensationCents: number;

  @IsNumber()
  participantCount: number;

  @IsString()
  userId: string;

  @IsString()
  comment: string;
}

export class TrainingUpdateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @Matches(/([0-9]{4})-(0[0-9]|1[012])-([012][0-9]|3[01])/)
  date: string;

  @IsNumber()
  courseId: number;

  @IsNumber()
  compensationCents: number;

  @IsOptional()
  @IsNumber()
  participantCount: number | null;

  @IsString()
  comment: string;
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

  @IsInt({ each: true })
  compensationClassIds: number[];
}

export class UserUpdateRequest extends UserCreateRequest {}

export class UserPatchRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsOptional()
  @IsIBAN()
  iban: string;

  @IsOptional()
  @IsString()
  termsAcceptedVersion: string;
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

type ErrorDetail = {
  message: string;
  code: string;
};

export type ErrorDto = {
  error: ErrorDetail;
};

/**
 * Represents compensation data for a trainer.
 * IBAN is at the top level (not in user object) because it represents
 * the historical IBAN value at the time of payment creation, captured
 * from PaymentUserIban table. This may differ from the user's current IBAN.
 */
export type CompensationDto = {
  user: {
    id: string;
    name: string;
  };
  iban: string;
  totalCompensationCents: number;
  totalTrainings: number;
  correspondingIds: number[];
  periodStart: string;
  periodEnd: string;
  costCenterId: number;
  costCenterName: string;
  courseName: string;
};

export type CompensationQueryResponse = {
  value: CompensationDto[];
};

export type CompensationValueDto = {
  id: number;
  cents: number;
  description: string;
  durationMinutes: number | null;
  compensationClassId: number | null;
};

export class CompensationValueCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsInt()
  cents: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  durationMinutes: number | null;
}

export class CompensationValueUpdateRequest extends CompensationValueCreateRequest {}

export class CourseCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsString()
  name: string;

  @IsInt()
  durationMinutes: number;

  @IsOptional()
  @IsEnum(DayOfWeek)
  weekday: DayOfWeek | null;

  @IsInt()
  startHour: number;

  @IsInt()
  startMinute: number;

  @IsArray()
  @IsString({ each: true })
  trainerIds: string[];

  @IsInt()
  costCenterId: number;
}

export type CourseQueryResponse = {
  value: CourseDto[];
};

export type CourseDto = Course & {
  trainers?: Pick<UserDto, 'name' | 'id'>[];
};

export class CourseUpdateRequest extends CourseCreateRequest {}

export function dayOfWeekToHumanReadable(w: DayOfWeek, short: boolean = false) {
  switch (w) {
    case 'MONDAY':
      return short ? 'Mo' : 'Montag';
    case 'TUESDAY':
      return short ? 'Di' : 'Dienstag';
    case 'WEDNESDAY':
      return short ? 'Mi' : 'Mittwoch';
    case 'THURSDAY':
      return short ? 'Do' : 'Donnerstag';
    case 'FRIDAY':
      return short ? 'Fr' : 'Freitag';
    case 'SATURDAY':
      return short ? 'Sa' : 'Samstag';
    case 'SUNDAY':
      return short ? 'So' : 'Sonntag';
  }
}

export type HolidayDto = {
  id: number;
  name: string;
  start: string;
  end: string;
};

export class HolidayCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsString()
  name: string;

  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}

export class HolidayUpdateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsString()
  name: string;

  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}

export type TrainingSummaryDto = {
  trainerId: string;
  trainerName: string;
  newTrainingCount: number;
  approvedTrainingCount: number;
};

export type TrainingSummaryListDto = {
  value: TrainingSummaryDto[];
};

export type CostCenterDto = {
  id: number;
  name: string;
  costCenterId: number;
  deletedAt: Date | null;
};

export class CostCenterCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsString()
  name: string;

  @IsNumber()
  costCenterId: number;
}

export class CostCenterUpdateRequest extends CostCenterCreateRequest {}

export type CostCenterQueryResponseDto = {
  value: CostCenterDto[];
};

export class PaymentCreateRequest {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  @IsArray()
  @IsInt({ each: true })
  trainingIds: number[];
}

export type PaymentDto = {
  id: number;
  user: { name: string };
  createdAt: string;
  trainingIds: number[];
  totalCents: number;
};

export type TrainingStatisticDto = {
  trainerId?: string;
  trainerName?: string;
  costCenterName?: string;
  courseId?: number;
  courseName?: string;

  trainingCountQ1: number;
  trainingCountQ2: number;
  trainingCountQ3: number;
  trainingCountQ4: number;
  trainingCountTotal: number;
  compensationCentsQ1: number;
  compensationCentsQ2: number;
  compensationCentsQ3: number;
  compensationCentsQ4: number;
  compensationCentsTotal: number;
};

export type TrainingStatisticsResponse = {
  value: TrainingStatisticDto[];
};

export type CompensationClassDto = {
  id: number;
  name: string;
  compensationValues?: CompensationValueDto[];
};

export type CompensationClassQueryResponse = {
  value: CompensationClassDto[];
};

export class CompensationClassCreateRequest {
  @IsString()
  name: string;

  constructor(obj: any) {
    Object.assign(this, obj);
  }
}

export class CompensationClassUpdateRequest extends CompensationClassCreateRequest {}

export type TrainingCountPerCourse = {
  course: Pick<Course, 'name' | 'id'>;
  count: number;
};

export type LoginInfo = {
  cognitoId: string;
  email: string;
  confirmed: boolean;
  groups: Group[];
};

export type TrainingDuplicateDto = {
  queriedId: number;
  duplicateId: number;
  duplicateTrainerName: string;
  duplicateCourseName: string;
};

export type TrainingDuplicateResponse = {
  value: TrainingDuplicateDto[];
};

export type TrainerReportCourseDto = {
  courseName: string;
  courseId: number;
  trainings: { date: string; compensationCents: number }[];
};

export type TrainerReportDto = {
  trainerName: string;
  courses: TrainerReportCourseDto[];
  periodStart: string;
  periodEnd: string;
};

export type ConfigurationValueDto = {
  key: string;
  value: string;
};

export type ConfigurationValueListResponse = {
  value: ConfigurationValueDto[];
};

export class ConfigurationValueUpdateRequest {
  @IsString()
  value: string;

  constructor(obj: any) {
    Object.assign(this, obj);
  }
}
