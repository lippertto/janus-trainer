import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Holiday } from './holiday.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import dayjs from 'dayjs';

@Injectable()
export class HolidaysService {
  private readonly log: Logger = new Logger();

  constructor(
    @InjectRepository(Holiday)
    private repo: Repository<Holiday>,
  ) {}

  async createHoliday(
    start: string,
    end: string,
    name: string,
  ): Promise<Holiday> {
    const startDate = dayjs(start);
    const endDate = dayjs(end);

    if (startDate > endDate) {
      throw new BadRequestException('start date must not be after end date');
    }
    const newHoliday = this.repo.create({ start, end, name });
    return this.repo.save(newHoliday);
  }

  async getHolidayById(id: string): Promise<Holiday | null> {
    const idAsNumber = parseInt(id);
    if (!idAsNumber) {
      this.log.debug(`id ${id} is not a holiday id.`);
      return null;
    }
    return await this.repo.findOneBy({ id: idAsNumber });
  }

  async deleteHoliday(id: string): Promise<void> {
    const idAsNumber = parseInt(id);
    if (!idAsNumber) {
      this.log.debug(`id ${id} is not a holiday id.`);
      return null;
    }
    await this.repo.delete({ id: idAsNumber });
  }

  async getHolidayByYear(yearList: number[]): Promise<Holiday[]> {
    let queryBuilder = this.repo
      .createQueryBuilder('holiday')
      .where("DATE_PART('year', holiday.start) = :year", { year: yearList[0] });

    for (const year of yearList.slice(1)) {
      queryBuilder = queryBuilder.orWhere(
        `DATE_PART('year', holiday.start) = ${year}`,
      );
    }

    return await queryBuilder.getMany();
  }
}
