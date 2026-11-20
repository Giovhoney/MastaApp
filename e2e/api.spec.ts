import { test, expect } from '@playwright/test';
import { createTestAccount } from './helpers';
test('inventory API reflects coherent shared MySQL data', async ({page}) => {
 await page.goto('/');
 const request=page.request;
 const res=await request.get('/api/inventory');expect(res.status()).toBe(200);
 const data=await res.json();expect(data.pails.length).toBeGreaterThan(100);
 expect(data.movements.length).toBeGreaterThan(300);
 expect(new Set(data.pails.map((p:{batchId:string})=>p.batchId)).size).toBe(data.pails.length);
 expect(new Set(data.pails.filter((p:{location:string})=>p.location).map((p:{location:string})=>p.location)).size).toBe(data.pails.filter((p:{location:string})=>p.location).length);
 expect(data.movements.every((m:{batchId:string})=>data.pails.some((p:{batchId:string})=>p.batchId===m.batchId))).toBe(true);
});
test('pilot API rejects invalid transactions without changing inventory',async({page})=>{
 const firstName=await createTestAccount(page);
 const request=page.request;
 const before=(await (await request.get('/api/inventory')).json()).movements.length;
 const base={firstName,pin:'849263',employeeId:'TEST-QA-READONLY',employeeName:'QA Test',batchId:'TEST-NONEXISTENT-000',action:'CHECKOUT',orderNumber:'TEST-ORDER',machine:'TCY'};
 for(const [body,status] of [[base,409],[{...base,batchId:'REAL-0001'},400],[{...base,action:'INVALID'},400]] as const){
  const r=await request.post('/api/pilot',{data:body,headers:{origin:'http://localhost:3000'}});expect(r.status()).toBe(status);
 }
 const after=(await (await request.get('/api/inventory')).json()).movements.length;expect(after).toBe(before);
});
