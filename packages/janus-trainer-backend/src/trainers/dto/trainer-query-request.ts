import { Matches } from 'class-validator';

export class TrainerQueryRequest {
  @Matches(/([0-9]{4})-(0[0-9]|1[012])-([012][0-9]|[3][01])/)
  start: string;

  @Matches(/([0-9]{4})-(0[0-9]|1[012])-([012][0-9]|[3][01])/)
  end: string;
}
