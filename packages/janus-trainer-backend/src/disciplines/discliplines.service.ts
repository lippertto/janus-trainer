import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Discipline } from './discipline.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class DisciplineService {
  constructor(
    @InjectRepository(Discipline)
    private repo: Repository<Discipline>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getAllDisciplines(): Promise<Discipline[]> {
    return this.repo.find();
  }

  async addDiscipline(name: string): Promise<Discipline> {
    const result = this.repo.create({ name });

    return this.repo.save(result);
  }

  async getDisciplineById(id: string): Promise<Discipline | null> {
    const idAsNumber = parseInt(id);
    if (!idAsNumber)
      throw new BadRequestException(`${id} is not a valid discipline id`);
    return this.repo.findOneBy({ id: idAsNumber });
  }

  async deleteDiscipline(id: string): Promise<void> {
    const idAsNumber = parseInt(id);
    if (!idAsNumber)
      throw new BadRequestException(`${id} is not a valid discipline id`);

    await this.repo.softDelete(id);
  }
}
