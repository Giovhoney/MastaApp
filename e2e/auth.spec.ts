import { test, expect } from '@playwright/test';
import { createTestAccount, openDashboard, TEST_PIN } from './helpers';
test('dashboard and inventory are public but transactions require PIN',async({request,page})=>{
 expect((await request.get('/api/inventory')).status()).toBe(200);
 expect((await request.get('/api/pilot')).status()).toBe(200);
 const res=await request.post('/api/pilot',{data:{action:'PURGE',batchId:'TEST-SAMPLE-0002',reason:'blocked'},headers:{origin:'http://localhost:3000'}});
 expect(res.status()).toBe(401);
 await openDashboard(page);
 await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
});
test('employee can create account without login and PIN is required per transaction',async({page})=>{
 const firstName=await createTestAccount(page);
 const base={action:'PURGE',batchId:'TEST-NONEXISTENT',reason:'blocked',firstName};
 const invalid=await page.request.post('/api/pilot',{data:{...base,pin:'111111'},headers:{origin:'http://localhost:3000'}});
 expect(invalid.status()).toBe(401);
 const valid=await page.request.post('/api/pilot',{data:{...base,pin:TEST_PIN},headers:{origin:'http://localhost:3000'}});
 expect(valid.status()).toBe(409);
 const csrf=await page.request.post('/api/pilot',{data:{...base,pin:TEST_PIN},headers:{origin:'http://untrusted.example'}});
 expect(csrf.status()).toBe(403);
 await page.reload();
 await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
});
test('checkout asks for credentials only when action is confirmed; cancel does not mutate inventory',async({page})=>{
 await openDashboard(page);
 const before=(await (await page.request.get('/api/inventory')).json()).movements.length;
 await page.getByRole('button',{name:'Checkout & Return',exact:true}).first().click();
 await page.getByPlaceholder('e.g. 304027').fill('TEST-VERIFY-ONLY');
 await page.getByRole('combobox',{name:'Production machine'}).selectOption({index:1});
 await page.getByPlaceholder('Search pails...').fill('TEST-SAMPLE-0002');
 await page.getByRole('button',{name:'Check out'}).first().click();
 await expect(page.getByRole('dialog',{name:'Verify this transaction'})).toBeVisible();
 await page.getByRole('button',{name:'Close verification'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 const after=(await (await page.request.get('/api/inventory')).json()).movements.length;
 expect(after).toBe(before);
});
