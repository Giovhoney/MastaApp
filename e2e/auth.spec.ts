import { test, expect } from '@playwright/test';
import { signIn } from './helpers';
test('inventory and write endpoints require a signed-in session',async({request})=>{
 expect((await request.get('/api/inventory')).status()).toBe(401);
 expect((await request.get('/api/pilot')).status()).toBe(401);
 const res=await request.post('/api/pilot',{data:{action:'PURGE',batchId:'TEST-SAMPLE-0002',reason:'blocked'},headers:{origin:'http://localhost:3000'}});
 expect(res.status()).toBe(401);
});
test('login rejects invalid credentials, prevents cross-origin writes, and logout revokes browser access',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
 await page.getByRole('textbox',{name:'First name'}).fill('Invalidname');
 await page.getByLabel('6-digit PIN').fill('111111');
 await page.getByRole('tab',{name:'Sign in'}).click();
 await page.getByRole('button',{name:'Sign in',exact:true}).last().click();
 await expect(page.getByText('Incorrect first name or PIN')).toBeVisible();
 await signIn(page);
 const csrf=await page.request.post('/api/pilot',{data:{action:'PURGE',batchId:'TEST-NONEXISTENT',reason:'blocked'},headers:{origin:'http://untrusted.example'}});
 expect(csrf.status()).toBe(403);
 await page.getByRole('button',{name:'Sign out'}).click();
 await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
 expect((await page.request.get('/api/inventory')).status()).toBe(401);
});
