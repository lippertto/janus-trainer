import { defineConfig } from 'cypress';
import 'dotenv/config';

export default defineConfig({
  env: {
    cognito_username: process.env.COGNITO_USERNAME,
    cognito_password: process.env.COGNITO_PASSWORD,
    cognito_domain: process.env.COGNITO_DOMAIN,
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    experimentalStudio: true,
  },
});
