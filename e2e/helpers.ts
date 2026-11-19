import { expect, type Page } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
export async function signIn(page: Page) {
 await page.goto('/');
 await page.getByRole('textbox',{name:'Employee ID'}).fill(process.env.PILOT_USER_ID!);
 await page.getByLabel('Password').fill(process.env.PILOT_PASSWORD!);
 await page.getByRole('button',{name:'Sign in'}).click();
 await expect(page.getByText('Connected: local MySQL')).toBeVisible({timeout:20000});
}
