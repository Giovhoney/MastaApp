import { test, expect } from '@playwright/test';
import { openDashboard } from './helpers';
const sections = ['Dashboard','Rack Inventory','Ink Lookup','Checkout & Return','Receive Ink','Placement Sheet','Location Audit','Ink Master List','Ink Request Review','Movement History','Order Ink Usage','Ink Machine History','Pail History','Purged Ink Register','Reorder Alerts','Administration'];
test('original dashboard loads shared MySQL stock and every navigation page without browser errors', async ({ page }) => {
 const errors:string[]=[];page.on('pageerror', e => errors.push(e.message));
 await openDashboard(page);
 await expect(page.getByText('Connected: local MySQL')).toBeVisible({timeout:20000});
 await expect(page.getByText('Connected: local MySQL')).toBeVisible();
 for(const name of sections){
   await page.getByRole('button',{name,exact:true}).first().click();
   await expect(page.getByRole('heading',{name,exact:true}).first()).toBeVisible();
   await expect(page.getByText('Connected: local MySQL')).toBeVisible();
 }
 expect(errors).toEqual([]);
});
test('rack inventory displays a known database pail and persists after refresh',async({page})=>{
 await openDashboard(page);await expect(page.getByText('Connected: local MySQL')).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'Rack Inventory',exact:true}).first().click();
 await expect(page.getByText('TEST-SAMPLE-0002').first()).toBeVisible();
 await page.reload();await expect(page.getByText('Connected: local MySQL')).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'Rack Inventory',exact:true}).first().click();
 await expect(page.getByText('TEST-SAMPLE-0002').first()).toBeVisible();
});
test('mobile viewport renders dashboard and can navigate',async({page})=>{
 await page.setViewportSize({width:390,height:844});await openDashboard(page);await expect(page.getByText('Connected: local MySQL')).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'Ink Lookup',exact:true}).first().click();
 await expect(page.getByRole('heading',{name:'Ink Lookup'})).toBeVisible();
});
