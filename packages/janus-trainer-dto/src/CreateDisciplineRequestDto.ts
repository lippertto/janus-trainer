import { IsString } from 'class-validator';

export class CreateDisciplineRequestDto {
  @IsString()
  name: string;
}
