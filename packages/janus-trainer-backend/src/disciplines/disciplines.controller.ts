import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { DisciplineListDto, DisciplineDto } from 'janus-trainer-dto';
import { Group } from 'janus-trainer-dto';
import { CreateDisciplineRequestDto } from 'janus-trainer-dto';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { type Discipline } from './discipline.entity';
import { DisciplineService } from './discliplines.service';

function toDto(d: Discipline): DisciplineDto {
  return { id: d.id.toString(), name: d.name };
}

@Controller('disciplines')
export class DisciplinesController {
  constructor(
    private readonly authService: AuthService,
    private readonly disciplineService: DisciplineService,
  ) {}

  @Get()
  async disciplines(@Req() request: Request): Promise<DisciplineListDto> {
    this.authService.requireGroup(request, [Group.TRAINERS, Group.ADMINS]);
    const list = this.disciplineService.getAllDisciplines();
    return { value: (await list).map(toDto) };
  }

  @Post()
  async addDiscipline(
    @Req() httpRequest: Request,
    @Body() request: CreateDisciplineRequestDto,
  ): Promise<DisciplineDto> {
    this.authService.requireGroup(httpRequest, [Group.ADMINS]);
    const newDiscipline = await this.disciplineService.addDiscipline(
      request.name,
    );
    return toDto(newDiscipline);
  }
}
