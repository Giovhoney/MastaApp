import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { signIn } from './helpers';
import { locations } from '../src/data/demo-store';

test('authenticated atomic receiving, checkout, return, move, purge, and rack reuse',async({page,request})=>{
 const db=new PrismaClient();
 const suffix=Date.now().toString(36).toUpperCase();
 const ids=[`TEST-E2E-${suffix}-A`,`TEST-E2E-${suffix}-B`,`TEST-E2E-${suffix}-C`];
 try {
  const denied=await request.get('/api/inventory');expect(denied.status()).toBe(401);
  const name=await signIn(page);
  const api=page.request;
  const post=async(data:unknown)=>api.post('/api/pilot',{data,headers:{origin:'http://localhost:3000'}});
  const inventory=await (await api.get('/api/inventory')).json();
  const used=new Set(inventory.pails.map((p:{location:string})=>p.location));
  const free=locations.filter(loc=>!used.has(loc));expect(free.length).toBeGreaterThan(2);
  const inkName=inventory.pails[0].inkName;
  const lines=[{batchId:ids[0],inkName,location:free[0],weightKg:20},{batchId:ids[1],inkName,location:free[1],weightKg:20}];
  let response=await post({action:'RECEIVE_BULK',lines:[lines[0],{...lines[1],location:'NOT-A-RACK'}]});expect(response.status()).toBe(409);
  expect(await db.inkPail.count({where:{batchId:{in:ids}}})).toBe(0);
  response=await post({action:'RECEIVE_BULK',lines});expect(response.status()).toBe(200);
  expect(await db.inkPail.count({where:{batchId:{in:ids}}})).toBe(2);
  response=await post({action:'CHECKOUT',batchId:ids[0],orderNumber:'TEST-E2E-ORDER',machine:'TCY',employeeId:'SPOOFED',employeeName:'Not Real'});expect(response.status()).toBe(200);
  const last=await db.inventoryMovement.findFirst({where:{batchId:ids[0],type:'CHECKOUT'},orderBy:{createdAt:'desc'}});
  expect(last?.employeeId).toBe((await db.appUser.findFirst({where:{displayName:name}}))?.id);
  response=await post({action:'RETURN',batchId:ids[0],weightKg:10});expect(response.status()).toBe(200);
  response=await post({action:'MOVE',batchId:ids[0],location:free[2]});expect(response.status()).toBe(200);
  response=await post({action:'PURGE',batchId:ids[0],reason:'E2E testing'});expect(response.status()).toBe(200);
  const retired=await db.inkPail.findUnique({where:{batchId:ids[0]}});expect(retired?.status).toBe('RETIRED');expect(retired?.locationCode).toBeNull();
  response=await post({action:'RECEIVE',batchId:ids[2],inkName,location:free[2],weightKg:20});expect(response.status()).toBe(200);
  const after=await (await api.get('/api/inventory')).json();expect(after.pails.find((p:{batchId:string})=>p.batchId===ids[0]).purged).toBe(true);
  expect(after.pails.find((p:{batchId:string})=>p.batchId===ids[2]).location).toBe(free[2]);
 } finally {
  await db.$transaction(async tx=>{
   await tx.inventoryMovement.deleteMany({where:{batchId:{in:ids}}});
   await tx.inkCheckout.deleteMany({where:{batchId:{in:ids}}});
   await tx.pilotPailDetails.deleteMany({where:{batchId:{in:ids}}});
   await tx.inkPail.deleteMany({where:{batchId:{in:ids}}});
  });
  await db.$disconnect();
 }
});
