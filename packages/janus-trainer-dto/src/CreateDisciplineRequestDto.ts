import { IsString } from 'class-validator';

export default class CreateDisciplineRequestDto {
  @IsString()
  name: string;
}
