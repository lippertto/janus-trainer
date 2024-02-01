import { Backend } from './backend';

describe('Backend', () => {
  test('handles dates as expected', () => {
    // GIVEN
    const response = {
      correspondingIds: ['4'],
      totalCompensationCents: 6000,
      totalTrainings: 1,
      trainer: {
        id: '1',
        name: 'Tobias Lippert',
        iban: 'DE25500105174253698841',
      },
      periodStart: '2023-11-01',
      periodEnd: '2023-11-30',
    };
    const sut = new Backend('http://localhost:3000');
    // WHEN
    const compensation = sut.compensationResponseToCompensation(response);
    // THEN
    expect(compensation.periodStart.format('YYYY-MM-DD')).toBe('2023-11-01');
    expect(compensation.periodEnd.format('YYYY-MM-DD')).toBe('2023-11-30');
  });
});
