import { Injectable, Logger } from '@nestjs/common';
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
    this.log.log(`Adding discipline '${name}'`);
    const result = this.repo.create({ name });

    return this.repo.save(result);
  }
}
