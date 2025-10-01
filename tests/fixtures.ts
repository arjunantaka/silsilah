import { test as base } from '@playwright/test';

// Extend base test with automatic dialog handling.
// Accepts confirm dialogs by default. For prompts, returns empty string unless overridden.

export const test = base.extend<{}>({
  page: async ({ page }, use) => {
    page.on('dialog', async dialog => {
      const type = dialog.type();
      if (type === 'confirm' || type === 'alert') {
        await dialog.accept();
      } else if (type === 'prompt') {
        await dialog.accept('');
      } else {
        await dialog.dismiss();
      }
    });
    await use(page);
  }
});

export const expect = test.expect;