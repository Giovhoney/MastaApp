import { expect, type Page } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
export async function signIn(page: Page) {
 await page.goto('/');
 await page.getByRole('tab',{name:'Create account'}).click();
 const firstName='Qa'+Array.from({length:14},()=>String.fromCharCode(97+Math.floor(Math.random()*26))).join('');
 await page.getByRole('textbox',{name:'First name'}).fill(firstName);
 await page.getByLabel('6-digit PIN').fill('849263');
 await page.getByRole('button',{name:'Create account',exact:true}).last().click();
 await expect(page.getByText('Connected: local MySQL')).toBeVisible({timeout:20000});
 return firstName;
}
