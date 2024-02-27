import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class SystemService {
  constructor(
    @InjectEntityManager()
    private em: EntityManager,
  ) {}

  async clearDatabases() {
    await this.em.query(`
        TRUNCATE TABLE "training";
        TRUNCATE TABLE "holiday";
        `);
  }
}
