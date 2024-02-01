declare module 'sepa' {
  export function validateIBAN(iban: string): boolean;
  export function validateCreditorID(cid: string): boolean;

  class GroupHeader {
    id: string;
    created: Date;
    initiatorName: string;
  }

  class PaymentInfo {
    collectionDate: Date;
    creditorIBAN: string;
    creditorBIC: string;
    creditorName: string;
    creditorId: string;
    /** Whether this should be individual statements in the bank account or multiple ones. */
    batchBooking?: boolean;
    requestedExecutionDate: Date;
    debtorId: string;
    debtorIBAN: string;
    debtorBIC: string;
    debtorName: string;

    createTransaction(): Transaction;
    addTransaction(Transaction);
  }

  class Transaction {
    creditorName: string;
    creditorIBAN: string;
    creditorBIC: string;
    mandateId: string;
    mandateSignatureDate: Date;
    amount: number;
    currency?: string;
    remittanceInfo: string;
    end2endId: string;
  }

  export class Document {
    constructor(string);

    grpHdr: GroupHeader;

    createPaymentInfo(): PaymentInfo;

    addPaymentInfo(paymentInfo: PaymentInfo);

    createTransaction(): Transaction;

    toString(): string;
  }
}
