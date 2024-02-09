import { Test, TestingModule } from '@nestjs/testing';

import { SharedService } from './shared.service';
import { BadRequestException } from '@nestjs/common';

describe('SharedService', () => {
  let service: SharedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedService],
    }).compile();

    service = module.get<SharedService>(SharedService);
  });

  test('should be defined', () => {
    expect(service).toBeDefined();
  });

  test('parses dates as expected', () => {
    const testdata = ['2022-04-11', '2021-02-02'];

    for (const entry of testdata) {
      expect(service.dateStringToDate(entry).format('YYYY-MM-DD')).toEqual(
        entry,
      );
    }
  });

  test('throws on invalid input', () => {
    expect(() => {
      service.dateStringToDate('abc--');
    }).toThrow(BadRequestException);
  });
});
