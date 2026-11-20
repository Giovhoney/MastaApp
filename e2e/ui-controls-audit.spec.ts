import {test,expect} from '@playwright/test';
import {openDashboard} from './helpers';
test('human checks of filters, forms, CSV buttons, unsupported writes',async({page})=>{
 test.setTimeout(120000);const log=(s:string)=>console.log('CONTROL_AUDIT',s);
 await openDashboard(page);
 const nav=async(s:string)=>{await page.getByRole('button',{name:s,exact:true}).first().click();await expect(page.getByRole('heading',{name:s,exact:true}).first()).toBeVisible();log('NAV '+s)};
 await nav('Ink Master List');await page.getByPlaceholder('Ink name / code').fill('TEST-UI-UNSUPPORTED-INK');await page.getByPlaceholder('e.g. 20.00').fill('20');await page.getByRole('button',{name:'Add ink',exact:true}).click();await expect(page.getByText('Ink master editing is not yet connected to MySQL. No change saved.')).toBeVisible();log('MASTER EDIT BLOCKED');
 await nav('Receive Ink');await page.getByPlaceholder('Exact ink description').fill('TEST-UI-REQUEST');await page.locator('form').filter({has:page.getByRole('button',{name:'Submit for approval'})}).locator('input[type=number]').fill('20');await page.getByRole('button',{name:'Submit for approval'}).click();await expect(page.getByText('Ink requests are not yet connected to MySQL. No change saved.')).toBeVisible();log('INK REQUEST BLOCKED');
 await nav('Stock Alerts');await page.getByRole('combobox').first().selectOption({index:1});await page.getByRole('spinbutton').first().fill('3');await page.getByRole('button',{name:'Save stock minimum'}).click();await expect(page.getByRole('dialog',{name:'Verify this transaction'})).toBeVisible();await page.getByRole('button',{name:'Close verification'}).click();log('STOCK MINIMUM REQUIRES PIN');
 await nav('Ink Lookup');await page.getByRole('textbox',{name:'Search inks'}).fill('019547');await expect(page.getByText('019547 Green (Oyster)').first()).toBeVisible();log('INK SEARCH');
 await nav('Rack Inventory');await page.getByRole('button',{name:/Export.*CSV/i}).first().click();log('INVENTORY CSV CLICK');
 await nav('Movement History');await page.getByRole('button',{name:'Export history CSV'}).click();log('MOVEMENT CSV CLICK');
 await nav('Administration');await expect(page.getByRole('button',{name:'Reset all demo data'})).toBeDisabled();log('RESET DISABLED ON MYSQL');
});
