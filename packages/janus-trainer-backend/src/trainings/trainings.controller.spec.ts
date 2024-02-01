import { BadRequestException } from '@nestjs/common';
import { TrainingsController as TrainingsController } from './trainings.controller';

describe('TrainingsController', () => {
  test('valid dates', () => {
    const sut = new TrainingsController(jest.fn() as any, jest.fn() as any);

    expect(sut.dateStringToDate('2021-02-02').format('YYYY-MM-DD')).toBe(
      '2021-02-02',
    );
  });

  test('detects invalid dates', () => {
    const sut = new TrainingsController(jest.fn() as any, jest.fn() as any);

    expect(() => {
      sut.dateStringToDate('abc--');
    }).toThrow(BadRequestException);
  });
});
