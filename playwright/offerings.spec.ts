import { expect, test } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { newBrowser } from './browser';

test.describe.serial('Offerings page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });
});
