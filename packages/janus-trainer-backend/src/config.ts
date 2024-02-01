import 'dotenv';
import * as fs from 'fs';

export const config = () => ({
  cognito: {
    issuer: process.env.OAUTH2_ISSUER,
    jwksUri: process.env.OAUTH2_JWKS_URI,
  },
  cors: {
    origin: process.env.JANUS_APP_HOST,
  },
  nestFactoryOptions: {
    httpsOptions:
      process.env.HTTPS_KEY && process.env.HTTPS_CERT
        ? {
            key: fs.readFileSync(process.env.HTTPS_KEY),
            cert: fs.readFileSync(process.env.HTTPS_CERT),
          }
        : undefined,
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
});
