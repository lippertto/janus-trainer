import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import dayjs from 'dayjs';

export interface CompensationSummary {
  correspondingIds: string[];
  userId: string;
  userName: string;
  userIban: string;
  totalTrainings: number;
  totalCompensationCents: number;
  periodStart: string;
  periodEnd: string;
}

@Injectable()
export class CompensationsService {
  private readonly log: Logger = new Logger();

  constructor(
    @InjectEntityManager()
    private em: EntityManager,
  ) {}

  /**
   * Summarize the trainings for each trainer.
   */
  async summarizeTraining(): Promise<CompensationSummary[]> {
    const result = await this.em.query(
      `SELECT CAST(u."id" AS TEXT) AS "userId",
               u.name as "userName",
               u.iban as "userIban",
               COUNT(*) as "totalTrainings",
               SUM(gt."compensationCents") as "totalCompensationCents",
               string_agg(gt.id::varchar, ',') as "correspondingIds",
               MIN(gt.date) as "periodStart",
               MAX(gt.date) as "periodEnd"
        FROM training AS gt INNER JOIN "user" AS u ON gt."userId" = u."id"
        WHERE gt.status = 'APPROVED'
        GROUP BY ("u"."id");`,
    );
    return result.map((r) => ({
      ...r,
      periodStart: dayjs(r.periodStart).format('YYYY-MM-DD'),
      periodEnd: dayjs(r.periodEnd).format('YYYY-MM-DD'),
      correspondingIds: r.correspondingIds.split(','),
      totalCompensationCents: parseInt(r.totalCompensationCents),
      totalTrainings: parseInt(r.totalTrainings),
    }));
  }
}
