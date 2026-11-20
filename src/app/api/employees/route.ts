import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authDb, hashPin, normalizeFirstName, sameOrigin, validFirstName } from '@/lib/pilot-auth';
import { ACTIONS, authorizedActor, permissionsFor } from '@/lib/permissions';
const noStore = {'Cache-Control':'no-store'};
const fail = (error:string,status=400)=>Response.json({error},{status,headers:noStore});
const role = z.enum(['ADMIN','INK_MANAGER','OPERATOR','CSR','QUALITY','MANAGEMENT']);
const schema = z.object({adminName:z.string(),adminPin:z.string(),operation:z.enum(['CREATE','UPDATE']),employeeId:z.string().optional(),firstName:z.string().optional(),pin:z.string().regex(/^\d{6}$/).optional(),role:role.optional(),active:z.boolean().optional(),permissions:z.array(z.enum(ACTIONS)).optional()});
export async function GET() {
 try {
  const users = await authDb.appUser.findMany({include:{credential:{select:{firstNameKey:true}}},orderBy:{displayName:'asc'}});
  const employees = await Promise.all(users.map(async user=>({id:user.id,name:user.displayName,role:user.role,active:user.active,hasPin:!!user.credential,permissions:await permissionsFor(user.id,user.role)})));
  return Response.json({employees}, {headers:noStore});
 } catch { return fail('Employee list unavailable',503); }
}
export async function POST(request:Request) {
 if (!sameOrigin(request)) return fail('Origin rejected',403);
 const parsed = schema.safeParse(await request.json().catch(()=>null));
 if (!parsed.success) return fail('Invalid employee management request');
 const data = parsed.data;
 const auth = await authorizedActor(data.adminName,data.adminPin,'MANAGE_EMPLOYEES');
 if ('error' in auth) return fail(auth.error ?? "Unauthorized",auth.status);
 const allowed = data.permissions?.filter(p=>p!=='MANAGE_EMPLOYEES') ?? [];
 try {
  let employeeId:string;
  if (data.operation==='CREATE') {
   if (!data.firstName || !validFirstName(data.firstName) || !data.pin || !data.role) return fail('Employee name, PIN and role are required');
   const pinHash = await hashPin(data.pin);
   const created = await authDb.appUser.create({data:{displayName:data.firstName.trim(),role:data.role,credential:{create:{firstNameKey:normalizeFirstName(data.firstName),pinHash}}}});
   employeeId=created.id;
  } else {
   if (!data.employeeId) return fail('Choose an employee');
   const current = await authDb.appUser.findUnique({where:{id:data.employeeId},include:{credential:true}});
   if (!current) return fail('Employee not found',404);
   if (data.firstName!==undefined && !validFirstName(data.firstName)) return fail('Invalid employee name');
   if (current.id===auth.user.id && (data.active===false || (data.role && data.role!=='ADMIN'))) return fail('You cannot remove your own administrator access',409);
   if (current.role==='ADMIN' && (data.active===false || (data.role && data.role!=='ADMIN'))) {
    const admins = await authDb.appUser.count({where:{role:'ADMIN',active:true}});
    if (admins<=1) return fail('Cannot deactivate the last active administrator',409);
   }
   await authDb.appUser.update({where:{id:current.id},data:{displayName:data.firstName?.trim(),role:data.role,active:data.active}});
   if (data.pin) {
    const pinHash=await hashPin(data.pin);
    await authDb.pilotCredential.upsert({where:{userId:current.id},create:{userId:current.id,firstNameKey:normalizeFirstName(data.firstName??current.displayName),pinHash},update:{pinHash,firstNameKey:normalizeFirstName(data.firstName??current.displayName)}});
   }
   if (data.firstName && data.firstName!==current.displayName && !data.pin && current.credential) await authDb.pilotCredential.update({where:{userId:current.id},data:{firstNameKey:normalizeFirstName(data.firstName)}});
   employeeId=current.id;
  }
  if (data.permissions) await authDb.systemSetting.upsert({where:{key:`employee-permissions:${employeeId}`},create:{key:`employee-permissions:${employeeId}`,value:JSON.stringify(allowed)},update:{value:JSON.stringify(allowed)}});
  await authDb.systemSetting.create({data:{key:`employee-audit:${randomUUID()}`,value:JSON.stringify({by:auth.user.id,id:employeeId,op:data.operation,role:data.role,active:data.active,pin:!!data.pin,perm:!!data.permissions})}});
  return Response.json({ok:true},{headers:noStore});
 } catch(e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2002') return fail('That employee name is already registered',409);
  return fail('Employee change could not be saved',500);
 }
}
