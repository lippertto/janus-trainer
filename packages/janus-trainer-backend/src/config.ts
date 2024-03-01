import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export const config = () => ({
  cognito: {
    issuer: `${process.env.COGNITO_BASE_URL}/${process.env.COGNITO_USER_POOL_ID}`,
    jwksUri: `${process.env.COGNITO_BASE_URL}/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  },
  cors: {
    origin: process.env.JANUS_APP_HOST,
  },
  port: parseInt(process.env.PORT),
  typeorm: {
    type: 'postgres',
    host: process.env.POSTGRES_HOST!,
    port: parseInt(process.env.POSTGRES_PORT) ?? 5432,
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    synchronize: process.env.SYNCHRONIZE_DATABASE ? true : false,
    migrations: ['src/migrations/*.ts'],
  },
  winston: {
    defaultMeta: { service: 'janus-trainer-app-backend' },
    format:
      process.env.NODE_ENV === 'development'
        ? nestWinstonModuleUtilities.format.nestLike('JanusTrainerApp', {
            colors: true,
          })
        : winston.format.json(),
    transports: [new winston.transports.Console({})],
  },
});
