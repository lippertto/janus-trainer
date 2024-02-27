import { defineConfig } from 'cypress';
import 'dotenv/config';

export default defineConfig({
  env: {
    cognito_domain: process.env.COGNITO_DOMAIN,
    cognito_admin_username: process.env.COGNITO_ADMIN_USERNAME,
    cognito_admin_password: process.env.COGNITO_ADMIN_PASSWORD,
    cognito_trainer_username: process.env.COGNITO_TRAINER_USERNAME,
    cognito_trainer_password: process.env.COGNITO_TRAINER_PASSWORD,
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    experimentalStudio: true,
  },
});
