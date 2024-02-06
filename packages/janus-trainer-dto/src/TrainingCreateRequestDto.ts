import { Matches, IsString, IsNumber } from 'class-validator';

export default class TrainingCreateRequestDto {
  @Matches(/([0-9]{4})-(0[0-9]|1[012])-([012][0-9]|[3][01])/)
  date: string;

  @IsString()
  disciplineId: string;

  @IsString()
  group: string;

  @IsNumber()
  compensationCents: number;

  @IsNumber()
  participantCount: number;

  @IsString()
  userId: string;
}