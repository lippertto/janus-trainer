import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Discipline } from './discipline.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DisciplineService {
  private readonly log: Logger = new Logger();

  constructor(
    @InjectRepository(Discipline)
    private repo: Repository<Discipline>,
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
