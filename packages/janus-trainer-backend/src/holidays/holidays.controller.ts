import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { Request } from 'express';

import {
  Group,
  HolidayCreateRequestDto,
  HolidayDto,
  HolidayListDto,
} from 'janus-trainer-dto';
import { Holiday } from './holiday.entity';
import { AuthService } from '../auth/auth.service';

function holidayToDto(h: Holiday): HolidayDto {
  return { name: h.name, start: h.start, end: h.end, id: h.id.toString() };
}

@Controller('holidays')
export class HolidaysController {
  constructor(
    private readonly authService: AuthService,
    private readonly holidayService: HolidaysService,
  ) {}

  @Post()
  async createHoliday(
    @Req() httpRequest: Request,
    @Body() request: HolidayCreateRequestDto,
  ): Promise<HolidayDto> {
    this.authService.requireGroup(httpRequest, [Group.ADMINS]);

    const holiday = await this.holidayService.createHoliday(
      request.start,
      request.end,
      request.name,
    );
    return holidayToDto(holiday);
  }

  @Get(':id')
  async getHoliday(@Param('id') id: string): Promise<HolidayDto> {
    const holiday = await this.holidayService.getHolidayById(id);
    if (!holiday) {
      throw new NotFoundException();
    }
    return holidayToDto(holiday);
  }

  @Get()
  async getHolidays(@Query('year') year: number): Promise<HolidayListDto> {
    if (!year) {
      throw new BadRequestException('Year must be provided');
    }
    const holidays = await this.holidayService.getHolidayByYear(year);
    return { value: holidays.map(holidayToDto) };
  }

  @Delete(':id')
  async deleteHoliday(
    @Req() httpRequest: Request,
    @Param('id') id: string,
  ): Promise<void> {
    this.authService.requireGroup(httpRequest, [Group.ADMINS]);

    await this.holidayService.deleteHoliday(id);
    throw new HttpException('OK', HttpStatus.NO_CONTENT);
  }
}
