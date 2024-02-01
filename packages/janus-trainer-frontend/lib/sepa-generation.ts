import md5 from 'md5';
import { Compensation } from './backend';
import * as sepa from 'sepa';

// There are two different formats for the sepa xml files.
// One is the
const FORMAT_FOR_TRANSFERS = 'pain.001.003.03';

function compensationHash(compensation: Compensation): string {
  const hash = md5(
    `${compensation.user.id}.${compensation.periodStart}.${compensation.periodEnd}.${compensation.totalCompensationCents}`,
  );
  return hash.substring(0, 4);
}

export function generateSepaXml(compensations: Compensation[]): string {
  const doc = new sepa.Document(FORMAT_FOR_TRANSFERS);
  const hashOfConcatenatedIds = md5(
    compensations.flatMap((c) => c.correspondingIds).join(),
  ).substring(0, 10);
  doc.grpHdr.id = `SCJTA-${hashOfConcatenatedIds}`;
  doc.grpHdr.created = new Date();
  doc.grpHdr.initiatorName = 'SC Janus e.V.';

  const info = doc.createPaymentInfo();
  info.collectionDate = new Date();
  info.debtorIBAN = 'DE36370400440222411100';
  info.debtorBIC = 'COBADEFFXXX';
  info.debtorName = 'SC Janus e.V.';
  info.debtorId = 'DE2600100000045188';
  info.batchBooking = false;
  // we request the execution for today
  info.requestedExecutionDate = new Date();
  doc.addPaymentInfo(info);

  compensations.forEach((c) => {
    const tx = info.createTransaction();
    tx.creditorName = c.user.name;
    tx.creditorIBAN = c.user.iban;
    tx.amount = c.totalCompensationCents / 100;
    tx.remittanceInfo = `Aufwandsentschädigung ${c.periodStart.format(
      'YYYY-MM-DD',
    )}..${c.periodEnd.format('YYYY-MM-DD')}`;
    tx.end2endId = compensationHash(c);
    // FIXME: remove line after patch. This is not needed.
    tx.mandateSignatureDate = new Date();
    info.addTransaction(tx);
  });
  return doc.toString();
}
