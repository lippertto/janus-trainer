import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';

import { logger } from './logging';

const sesClient = new SESClient({ region: process.env.COGNITO_REGION });

function buildSendCommand(recipient: string, subject: string, body: string) {
  return new SendEmailCommand({
    Destination: {
      ToAddresses: [recipient],
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: body,
        },
      },
    },
    Source: 'noreply@mail.lippert.dev',
  });
}

export async function sendEmail(
  recipient: string,
  subject: string,
  body: string,
) {
  const command = buildSendCommand(recipient, subject, body);
  try {
    return await sesClient.send(command);
  } catch (caught) {
    if (caught instanceof Error && caught.name === 'MessageRejected') {
      logger.warn(
        `Could not send email to ${recipient} . Reported error is ${caught}`,
      );
    }
  }
}
