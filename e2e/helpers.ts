import { expect, type Page } from '@playwright/test';
export const TEST_PIN = '849263';
export async function openDashboard(page: Page) {
 await page.goto('/');
 await expect(page.getByText('Connected: local MySQL')).toBeVisible({timeout:20000});
}
export async function createTestAccount(page: Page) {
 await openDashboard(page);
 await page.getByRole('button',{name:'Create employee account'}).click();
 const firstName='Qa'+Array.from({length:14},()=>String.fromCharCode(97+Math.floor(Math.random()*26))).join('');
 await page.getByRole('textbox',{name:'First name'}).fill(firstName);
 await page.getByLabel('6-digit PIN').fill(TEST_PIN);
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 return firstName;
}
