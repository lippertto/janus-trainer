import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';

import { Dayjs } from 'dayjs';
import { TrainerListEntry } from './dto/trainer-query-response';

@Injectable()
export class TrainersService {
  constructor(
    @InjectEntityManager()
    private em: EntityManager,
  ) {}

  async getTrainersWithTrainings(
    firstDay: Dayjs,
    lastDay: Dayjs,
  ): Promise<TrainerListEntry[]> {
    const result = await this.em.query(`
        SELECT
        SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) AS "newCount",
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS "approvedCount",
        SUM(CASE WHEN status = 'COMPENSATED' THEN 1 ELSE 0 END) AS "compensatedCount",
        "training"."userId" AS "userId", "user"."name" AS "userName"
        FROM "training" INNER JOIN "user" ON "training"."userId" = "user"."id"
        AND "training".date >= '${firstDay.format('YYYY-MM-DD')}'
        AND "training".date <= '${lastDay.format('YYYY-MM-DD')}'
        GROUP BY("training"."userId", "user"."name")
        `);
    const mappedResult = result.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      newCount: parseInt(r.newCount),
      approvedCount: parseInt(r.approvedCount),
      compensatedCount: parseInt(r.compensatedCount),
    }));

    return mappedResult;
  }
}
