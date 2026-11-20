import { test, expect } from '@playwright/test';
test('employee list visible, self-registration disabled, and changes require admin', async ({page})=>{
 await page.goto('/');
 await expect(page.getByText('Connected: local MySQL')).toBeVisible();
 await expect(page.getByRole('button',{name:'Create employee account'})).toHaveCount(0);
 await page.getByRole('button',{name:'Employee Master List',exact:true}).first().click();
 await expect(page.getByRole('heading',{name:'Employee Master List'}).first()).toBeVisible();
 await expect(page.getByText('Everyone can view employees, roles and permissions.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Add employee'})).toBeVisible();
 const employees=await page.request.get('/api/employees');expect(employees.status()).toBe(200);
 const json=await employees.json();expect(Array.isArray(json.employees)).toBe(true);
 expect(JSON.stringify(json)).not.toContain('pinHash');
 const registration=await page.request.put('/api/auth',{data:{firstName:'Unapproved',pin:'123456'},headers:{origin:'http://localhost:3000'}});expect(registration.status()).toBe(403);
 const denied=await page.request.post('/api/employees',{data:{operation:'CREATE',adminName:'Nobody',adminPin:'123456',firstName:'Test',pin:'123456',role:'OPERATOR',permissions:['CHECKOUT']},headers:{origin:'http://localhost:3000'}});expect(denied.status()).toBe(401);
});
