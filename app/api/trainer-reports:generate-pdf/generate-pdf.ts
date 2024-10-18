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
      x: 10,
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

function drawDate(
  page: PDFPage,
  defaultTextOptions: DefaultTextOptions,
  today: dayjs.Dayjs,
) {
  page.drawText(`Köln, ${today.format('DD.MM.YYYY')}\n`, {
    ...defaultTextOptions,
    x: page.getWidth() - 140,
    y: page.getHeight() - 250,
  });
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
      `${trainingCount} Übungseinheiten im SC Janus e.V. angeleitet hat und mit ${value} entschädigt wurde. Die Einheiten teilen sich folgendermaßen auf:`,
    {
      ...defaultTextOptions,
      y: currentY,
    },
  );
  return currentY - 50;
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
};

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
  return currentY - 40;
}

function sumOfCentsForOneMonth(
  c: TrainerReportCourse,
  monthNumber: number,
): number {
  return c.trainings
    .filter((t) => {
      const month = t.date.split('-')[1];
      return parseInt(month) === monthNumber;
    })
    .map((oneDate) => {
      return oneDate.compensationCents;
    })
    .reduce((partial, value) => partial + value, 0);
}

function addOneTable(
  page: PDFPage,
  course: TrainerReportCourse,
  defaultTextOptions: DefaultTextOptions,
  currentY: number,
): number {
  const tableHeight = 50;
  const tableWidth = 510;
  const tableStartLeft = 30;
  const tableStartBottom = currentY - tableHeight - 15; // -15 for the text

  const euros = course.trainings
    .map((t) => t.compensationCents)
    .reduce((previous, current) => previous + current, 0);

  const text = `${course.courseName}, ${course.trainings.length} Einheiten, ${currencyFormatter(euros / 100.0)}`;

  page.drawText(text, {
    ...defaultTextOptions,
    x: tableStartLeft,
    y: currentY,
  });

  const months = [
    'Jan',
    'Feb',
    'Mär',
    'Apr',
    'Mai',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dez',
  ];

  months.forEach((m, index) => {
    const textStart = tableStartLeft + (tableWidth / 12) * index + 5;
    page.drawText(m, {
      ...defaultTextOptions,
      y: currentY - 30,
      x: textStart,
    });

    const value = sumOfCentsForOneMonth(course, index + 1);
    page.drawText(currencyFormatter(value / 100), {
      ...defaultTextOptions,
      y: currentY - 55,
      x: textStart,
      size: 8,
    });

    const linePosition = tableStartLeft + (tableWidth / 12) * index;
    if (index !== 0) {
      page.drawLine({
        start: { y: tableStartBottom, x: linePosition },
        end: { y: tableStartBottom + tableHeight, x: linePosition },
      });
    }
  });

  page.drawRectangle({
    x: tableStartLeft,
    y: tableStartBottom,
    width: tableWidth,
    height: tableHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  page.drawLine({
    start: {
      x: tableStartLeft,
      y: tableStartBottom + tableHeight / 2,
    },
    end: {
      x: tableStartLeft + tableWidth,
      y: tableStartBottom + tableHeight / 2,
    },
    color: rgb(0, 0, 0),
  });

  return tableStartBottom - 20;
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
  drawDate(page, defaultTextOptions, currentDate);

  let currentY = page.getHeight() - 300;

  currentY = drawIntroText(page, defaultTextOptions, input, currentY);
  input.courses.forEach((c) => {
    currentY = addOneTable(page, c, defaultTextOptions, currentY);
  });

  currentY -= 10;
  currentY = drawClosingStatement(page, defaultTextOptions, currentY);

  return await pdfDoc.save();
}
