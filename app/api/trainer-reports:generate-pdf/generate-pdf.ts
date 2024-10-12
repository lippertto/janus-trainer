import type {
  PDFEmbeddedPage,
  PDFFont,
  PDFPage,
  PDFPageDrawTextOptions,
} from 'pdf-lib';
import { PageSizes, PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

import fs from 'node:fs';
import dayjs from 'dayjs';
import { currencyFormatter } from '@/lib/formatters';

type DefaultTextOptions = Pick<
  PDFPageDrawTextOptions,
  'size' | 'color' | 'lineHeight' | 'font' | 'x' | 'maxWidth'
>;

function drawHeader(page: PDFPage, font: PDFFont) {
  page.drawText(
    'Sport Club Janus e.V.\n' +
      'Hohenstaufenring 42\n' +
      '50674 Köln\n\n' +
      'Fon +49 221 92559 30\n' +
      'Fax +49 221 92559 31\n' +
      'Mail info@sc-janus.de',
    {
      size: 11,
      color: rgb(0, 0, 0),
      font: font,
      x: page.getWidth() - 220,
      y: page.getHeight() - 120,
      lineHeight: 12,
    },
  );
}

function drawFooter(page: PDFPage, font: PDFFont) {
  page.drawText(
    'Amtsgericht Köln VR Nr. 43 VR 7915 | USt-ID: 186058937 | Vorstand nach BGB: Andrea Löwe, Vorstandsvorsitzende. Stephan Borggreve, Kassenwart',
    {
      size: 8,
      color: rgb(1, 1, 1),
      font: font,
      x: 5,
      y: 13,
      lineHeight: 10,
    },
  );
}

function drawLogo(page: PDFPage, logo: PDFEmbeddedPage) {
  page.drawPage(logo, {
    x: page.getWidth() - 100,
    y: page.getHeight() - 200,
    width: 100,
    height: 200,
  });
}

function drawBottomLine(page: PDFPage) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: 30,
    color: rgb(19 / 255, 41 / 255, 75 / 255),
  });
}

function drawDateAndSign(
  page: PDFPage,
  defaultTextOptions: DefaultTextOptions,
  today: dayjs.Dayjs,
  docId: number,
) {
  page.drawText(
    `Köln, ${today.format('DD.MM.YYYY')}\n` + `Unser Zeichen: AA/${docId}`,
    {
      ...defaultTextOptions,
      x: page.getWidth() - 140,
      y: page.getHeight() - 300,
    },
  );
}

function drawIntroText(
  page: PDFPage,
  defaultTextOptions: DefaultTextOptions,
  input: TrainerReportInput,
  currentY: number,
) {
  const trainingCount = input.courses
    .map((t) => t.trainings.length)
    .reduce((partial, value) => partial + value, 0);
  const totalCompensation = input.courses
    .flatMap((t) => t.trainings)
    .flatMap((oneDate) => oneDate.compensationCents)
    .reduce((partial, value) => partial + value, 0);
  const value = currencyFormatter(totalCompensation / 100.0);

  page.drawText(
    `Hiermit bestätigen wir, dass ${input.trainerName} im Zeitraum ${input.periodStart.format('DD.MM.YYYY')} bis ${input.periodEnd.format('DD.MM.YYYY')} ` +
      `${trainingCount} Übungseinheiten im SC Janus e.V. angeleitet hat und mit ${value} entschädigt wurde.`,
    {
      ...defaultTextOptions,
      y: currentY,
    },
  );
  return currentY - 30;
}

function setMetadata(
  pdfDoc: PDFDocument,
  today: dayjs.Dayjs,
  input: { trainerName: string },
) {
  pdfDoc.setCreator('Janus Abrechnungs App');
  pdfDoc.setCreationDate(today.toDate());
  pdfDoc.setTitle(`Stundenabrechnung für ${input.trainerName}`);
}

type TrainerReportCourse = {
  courseName: string;
  trainings: { date: string; compensationCents: number }[];
};

export type TrainerReportInput = {
  trainerName: string;
  courses: TrainerReportCourse[];
  periodStart: dayjs.Dayjs;
  periodEnd: dayjs.Dayjs;
  docId: number;
};

function drawDetails(
  page: PDFPage,
  defaultTextOptions: DefaultTextOptions,
  trainings: TrainerReportCourse[],
  currentY: number,
) {
  page.drawText(`Die Einheiten teilen sich folgendermaßen auf:`, {
    ...defaultTextOptions,

    y: currentY,
  });
  currentY -= 16;
  for (const oneTraining of trainings) {
    const totalCompensation = oneTraining.trainings
      .map((t) => t.compensationCents)
      .reduce((previous, current) => previous + current, 0);
    const value = currencyFormatter(totalCompensation / 100.0);
    page.drawText('∙ ', {
      ...defaultTextOptions,
      x: defaultTextOptions.x! + 5,
      y: currentY,
    });
    page.drawText(
      `${oneTraining.courseName}\n` +
        `${oneTraining.trainings.length} Einheiten, Gesamt-Aufwandsentschädigung: ${value}`,
      {
        ...defaultTextOptions,
        x: defaultTextOptions.x! + 15,
        y: currentY,
      },
    );
    currentY -= 30;
  }

  return currentY;
}

function drawClosingStatement(
  page: PDFPage,
  defaultTextOptions: DefaultTextOptions,
  currentY: number,
) {
  page.drawText(
    `Dieses Dokument wurde automatisch erstellt und wird nicht unterschrieben.`,
    {
      ...defaultTextOptions,
      y: currentY,
    },
  );
  return currentY - 20;
}

export async function generatePdf(
  currentDate: dayjs.Dayjs,
  input: TrainerReportInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // fontkit is needed to embed custom fonts
  pdfDoc.registerFontkit(fontkit);

  setMetadata(pdfDoc, currentDate, input);

  const fontData = fs.readFileSync(`./public/trebuc.ttf`);
  const font = await pdfDoc.embedFont(fontData);

  const defaultTextOptions: DefaultTextOptions = {
    size: 11,
    color: rgb(0, 0, 0),
    lineHeight: 12,
    font: font,
    x: 30,
    maxWidth: 540,
  };

  const logoData = fs.readFileSync(`./public/logo.pdf`);
  const [logo] = await pdfDoc.embedPdf(logoData);

  const page = pdfDoc.addPage(PageSizes.A4);

  // setup page
  drawLogo(page, logo);
  drawBottomLine(page);
  drawFooter(page, font);
  drawHeader(page, font);
  drawDateAndSign(page, defaultTextOptions, currentDate, input.docId);

  let currentY = 400;

  currentY = drawIntroText(page, defaultTextOptions, input, currentY);

  currentY = drawDetails(page, defaultTextOptions, input.courses, currentY);
  drawClosingStatement(page, defaultTextOptions, currentY);

  return await pdfDoc.save();
}
