import { IsDateString, IsString } from 'class-validator';

export class HolidayCreateRequestDto {
  @IsString()
  name: string;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;
}
