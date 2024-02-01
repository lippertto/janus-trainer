import { Controller, Get } from '@nestjs/common';
import { GetAllSportsResponse } from './dto/get-all-sports-response';

@Controller('sports')
export class SportsController {
  @Get()
  async getAllSports(): Promise<GetAllSportsResponse> {
    return {
      value: [
        { name: 'Boxen' },
        { name: 'Brazilian Jiu-Jitsu' },
        { name: 'Kalah' },
        { name: 'Taekwondo' },
        { name: 'Schwimmen' },
        { name: 'Aqua Fitness' },
        { name: 'Kanu' },
        { name: 'Rudern' },
      ],
    };
  }
}
