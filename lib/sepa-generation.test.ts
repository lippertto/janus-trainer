/**
 * @vitest-environment jsdom
 */
import { validateCreditorID, validateIBAN } from 'sepa';
import { generateSepaXml } from './sepa-generation';
import { sanitizeSepa } from './sepa-charset';
import { CompensationDto } from '@/lib/dto';
import xpath from 'xpath';
import { describe, expect, test, vi } from 'vitest';

// EPC217-08 allowed characters: a-z A-Z 0-9 space / - ? : ( ) . , ' +
const SEPA_CHARSET = /^[a-zA-Z0-9 /\-?:().,'+]*$/;

describe('sanitizeSepa', () => {
  test('transliterates German umlauts and sharp-s', () => {
    expect(sanitizeSepa('Jörg Müller-Schröße')).toBe('Joerg Mueller-Schroesse');
  });

  test('transliterates uppercase umlauts', () => {
    expect(sanitizeSepa('Ärger mit Öl und Über')).toBe('Aerger mit Oel und Ueber');
  });

  test('passes through already-valid SEPA characters unchanged', () => {
    expect(sanitizeSepa('SC Janus e.V.')).toBe('SC Janus e.V.');
  });

  test('drops characters with no SEPA equivalent', () => {
    // emoji and other non-Latin chars have no mapping and are dropped
    expect(sanitizeSepa('Test☃Name')).toBe('TestName');
  });

  test('collapses multiple spaces and trims', () => {
    expect(sanitizeSepa('  Hello   World  ')).toBe('Hello World');
  });
});

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

// Helper function to extract creditor IBANs from SEPA XML
function getCreditorIbansFromSepaXml(sepaXml: string): string[] {
  const sepaDom = new DOMParser().parseFromString(sepaXml, 'text/xml');
  const select = xpath.useNamespaces({
    pain: 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.09',
  });
  const creditorAccounts = select(
    `${TRANSACTIONS}/pain:CdtrAcct/pain:Id/pain:IBAN/text()`,
    sepaDom,
    false,
  ) as any as Node[];
  return creditorAccounts.map((node) => node.textContent || '');
}

describe('sepa generation works', () => {
  test('Test sepa generation', () => {
    // GIVEN
    const c1: CompensationDto = {
      user: {
        id: '4',
        name: 'trainer 1',
      },
      iban: 'DE11500105171658347596',
      correspondingIds: [1, 2],
      periodStart: '2023-04-01',
      periodEnd: '2023-04-30',
      totalCompensationCents: 50000,
      totalTrainings: 4,
      costCenterId: 1,
      costCenterName: 'Kostenstelle 1',
      courseName: 'Kurs 1',
    };
    const c2: CompensationDto = {
      user: {
        id: '5',
        name: 'trainer 2',
      },
      iban: 'DE78500105172112588369',
      correspondingIds: [3, 5],
      periodStart: '2023-04-01',
      periodEnd: '2023-04-30',
      totalCompensationCents: 10000,
      totalTrainings: 2,
      costCenterId: 2,
      costCenterName: 'Kostenstelle 2',
      courseName: 'Kurs 2',
    };
    // WHEN
    const sepaXml = generateSepaXml([c1, c2]);
    // THEN
    const sepaDom = new DOMParser().parseFromString(sepaXml, 'text/xml');
    const select = xpath.useNamespaces({
      pain: 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.09',
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
    expect(remittanceInfo[0].textContent).toBe('Kurs 1 2023-04-01..2023-04-30');
    // test the amounts
    const instructedAmounts = select(
      `${TRANSACTIONS}/pain:Amt/pain:InstdAmt/text()`,
      sepaDom,
      false,
    ) as any as Node[];
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
    const creditorIbans = getCreditorIbansFromSepaXml(sepaXml);
    expect(creditorIbans).toHaveLength(2);
    expect(creditorIbans[0]).toBe('DE11500105171658347596');
    expect(creditorIbans[1]).toBe('DE78500105172112588369');
  });

  test('transliterates umlaut names to the EPC217-08 SEPA charset in generated XML', () => {
    // GIVEN: a trainer with a German umlaut name and a course with umlaut characters
    const c: CompensationDto = {
      user: {
        id: '7',
        name: 'Jörg Müller-Schröße',
      },
      iban: 'DE11500105171658347596',
      correspondingIds: [10],
      periodStart: '2024-01-01',
      periodEnd: '2024-01-31',
      totalCompensationCents: 7500,
      totalTrainings: 3,
      costCenterId: 1,
      costCenterName: 'Kostenstelle 1',
      courseName: 'Kräftigungsübungen',
    };
    // WHEN
    const sepaXml = generateSepaXml([c]);
    // THEN: the Nm element must contain only EPC217-08 allowed characters
    const sepaDom = new DOMParser().parseFromString(sepaXml, 'text/xml');
    const select = xpath.useNamespaces({
      pain: 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.09',
    });
    const creditorNames = select(
      `${TRANSACTIONS}/pain:Cdtr/pain:Nm/text()`,
      sepaDom,
      false,
    ) as any as Node[];
    expect(creditorNames).toHaveLength(1);
    const name = creditorNames[0].textContent ?? '';
    // Must not contain any character outside the EPC217-08 basic character set
    expect(name).toMatch(SEPA_CHARSET);
    expect(name).toBe('Joerg Mueller-Schroesse');
    // remittance info must also be transliterated
    const remittanceNodes = select(
      `${TRANSACTIONS}/pain:RmtInf/pain:Ustrd/text()`,
      sepaDom,
      false,
    ) as any as Node[];
    expect(remittanceNodes).toHaveLength(1);
    const remittance = remittanceNodes[0].textContent ?? '';
    expect(remittance).toMatch(SEPA_CHARSET);
    expect(remittance).toBe('Kraeftigungsuebungen 2024-01-01..2024-01-31');
  });
});
