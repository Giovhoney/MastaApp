import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { loadEnvConfig } from '@next/env';
import { createTestAccount, TEST_PIN } from './helpers';
loadEnvConfig(process.cwd());
test('stock minimum saved from browser to MySQL, with no purchasing workflow', async ({page}) => {
 const db = new PrismaClient();
 const ink = '019547 Green (Oyster)';
 try {
  const name = await createTestAccount(page);
  await page.getByRole('button', {name:'Stock Alerts', exact:true}).first().click();
  await expect(page.getByRole('heading', {name:'Stock Alerts'}).first()).toBeVisible();
  await expect(page.getByText('No purchase orders or emails are created by MastaApp.')).toBeVisible();
  await page.getByRole('combobox').first().selectOption({label:ink});
  await page.getByRole('spinbutton').first().fill('2');
  await page.getByRole('button', {name:'Save stock minimum'}).click();
  await page.getByRole('textbox',{name:'First name'}).fill(name);
  await page.getByLabel('6-digit PIN').fill(TEST_PIN);
  await page.getByRole('button',{name:'Verify & confirm'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Stock minimum saved for '+ink+'.')).toBeVisible();
  const master = await db.inkMaster.findUniqueOrThrow({where:{description:ink}});
  const setting = await db.systemSetting.findUnique({where:{key:'stock-min:'+master.id}});
  expect(setting?.value).toBe('2');
  await page.reload();
  await page.getByRole('button',{name:'Stock Alerts',exact:true}).first().click();
  await page.getByRole('combobox').first().selectOption({label:ink});
  await expect(page.getByRole('spinbutton').first()).toHaveValue('2');
  console.log('STOCK_ALERT_UI_AND_DB_PASS', ink, setting?.value);
 } finally { await db.$disconnect(); }
});
