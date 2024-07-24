/**
 * @jest-environment jsdom
 */
import { validateCreditorID, validateIBAN } from 'sepa';
import { generateSepaXml } from './sepa-generation';
import { CompensationDto } from '@/lib/dto';
import xpath from 'xpath';

describe('Test sepa library', () => {
  test('CID validation', () => {
    expect(validateCreditorID('DE2600100000045188')).toBe(true);
  });

  test('validates IBAN', () => {
    expect(validateIBAN('DE03500105175984997529')).toBe(true);
    expect(validateIBAN('DE36370400440222411100')).toBe(true);
  });
});

const TRANSACTIONS =
  '/pain:Document/pain:CstmrCdtTrfInitn/pain:PmtInf/pain:CdtTrfTxInf';
describe('sepa generation works', () => {
  test('Test sepa generation', () => {
    // GIVEN
    const c1: CompensationDto = {
      user: {
        id: '4',
        name: 'trainer 1',
        iban: 'DE11500105171658347596',
      },
      correspondingIds: [1, 2],
      periodStart: '2023-04-01',
      periodEnd: '2023-04-30',
      totalCompensationCents: 50000,
      totalTrainings: 4,
      costCenterId: 1,
      costCenterName: "Kostenstelle 1",
      courseName: 'Kurs 1',
    };
    const c2: CompensationDto = {
      user: {
        id: '5',
        name: 'trainer 2',
        iban: 'DE78500105172112588369',
      },
      correspondingIds: [3, 5],
      periodStart: '2023-04-01',
      periodEnd: '2023-04-30',
      totalCompensationCents: 10000,
      totalTrainings: 2,
      costCenterId: 2,
      costCenterName: "Kostenstelle 2",
      courseName: 'Kurs 2',
    };
    // WHEN
    const sepaXml = generateSepaXml([c1, c2]);
    // THEN
    const sepaDom = new DOMParser().parseFromString(sepaXml, 'text/xml');
    const select = xpath.useNamespaces({
      pain: 'urn:iso:std:iso:20022:tech:xsd:pain.001.003.03',
    });
    // there should be two transactions
    const transactions = select(TRANSACTIONS, sepaDom, false);
    expect(transactions).toHaveLength(2);
    // test the text for the first transaction
    const remittanceInfo: Node[] = select(
      `${TRANSACTIONS}/pain:RmtInf/pain:Ustrd/text()`,
      sepaDom,
      false,
    ) as any;
    expect(remittanceInfo[0].textContent).toBe(
      'Kurs 1 2023-04-01..2023-04-30',
    );
    // test the amounts
    const instructedAmounts = select(
      `${TRANSACTIONS}/pain:Amt/pain:InstdAmt/text()`,
      sepaDom,
      false,
    )as any as Node[];
    expect(instructedAmounts).toHaveLength(2);
    expect(instructedAmounts[0]?.textContent).toBe('500.00');
    expect(instructedAmounts[1]?.textContent).toBe('100.00');
    // test the names
    const creditorNames = select(
      `${TRANSACTIONS}/pain:Cdtr/pain:Nm/text()`,
      sepaDom,
      false,
    ) as any as Node[];
    expect(creditorNames).toHaveLength(2);
    expect(creditorNames[0].textContent).toBe('trainer 1');
    expect(creditorNames[1].textContent).toBe('trainer 2');
    // test the IBANs
    const creditorAccounts = select(
      `${TRANSACTIONS}/pain:CdtrAcct/pain:Id/pain:IBAN/text()`,
      sepaDom,
      false,
    ) as any as Node[];
    expect(creditorAccounts).toHaveLength(2);
    expect(creditorAccounts[0].textContent).toBe('DE11500105171658347596');
    expect(creditorAccounts[1].textContent).toBe('DE78500105172112588369');
  });
});
