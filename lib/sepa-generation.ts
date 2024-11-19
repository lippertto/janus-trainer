import md5 from 'md5';
import * as sepa from 'sepa';
import { CompensationDto } from './dto';

// There are two different formats for the sepa xml files.
// This is the one used for transfers
const FORMAT_FOR_TRANSFERS = 'pain.001.001.09';

function compensationHash(compensation: CompensationDto): string {
  const hash = md5(
    `${compensation.user.id}.${compensation.courseName}.${compensation.periodStart}.${compensation.periodEnd}.${compensation.totalCompensationCents}`,
  );
  return hash.substring(0, 4);
}

export function generateSepaXml(compensations: CompensationDto[]): string {
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
    tx.remittanceInfo = `${c.courseName} ${c.periodStart}..${c.periodEnd}`;
    tx.end2endId = compensationHash(c);
    // FIXME: remove line after patch. This is not needed.
    tx.mandateSignatureDate = new Date();
    info.addTransaction(tx);
  });
  return doc.toString();
}
