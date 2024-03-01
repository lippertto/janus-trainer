import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@codegenie/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { config } from './config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

let server: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors(config().cors);

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
