import { IsString } from 'class-validator';

export default class DisciplineCreateRequestDto {
  @IsString()
  name: string;
}
