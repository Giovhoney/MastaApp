import { authDb, verifyActor } from './pilot-auth';
export const ACTIONS = ['CHECKOUT','RETURN','RECEIVE','MOVE','PURGE','STOCK_THRESHOLD','MANAGE_EMPLOYEES'] as const;
export type Action = typeof ACTIONS[number];
export const DEFAULT_PERMISSIONS: Record<string, Action[]> = {
 ADMIN: [...ACTIONS],
 INK_MANAGER: ['CHECKOUT','RETURN','RECEIVE','MOVE','PURGE','STOCK_THRESHOLD'],
 OPERATOR: ['CHECKOUT','RETURN'],
 CSR: [], QUALITY: [], MANAGEMENT: [],
};
export async function permissionsFor(userId: string, role: string): Promise<Action[]> {
 if (role === 'ADMIN') return [...ACTIONS];
 const saved = await authDb.systemSetting.findUnique({where:{key:`employee-permissions:${userId}`}});
 if (!saved) return DEFAULT_PERMISSIONS[role] ?? [];
 try { const values: unknown = JSON.parse(saved.value); return Array.isArray(values) ? ACTIONS.filter(a=>values.includes(a) && a !== 'MANAGE_EMPLOYEES') : []; } catch { return []; }
}
const attempts = new Map<string,{count:number;until:number}>();
export async function authorizedActor(firstName: string, pin: string, action: Action) {
 const key=firstName.trim().toLowerCase();const now=Date.now();const recent=attempts.get(key);
 if(recent && recent.until>now && recent.count>=5)return {error:'Too many PIN attempts. Try again in 15 minutes.',status:429} as const;
 const actor = await verifyActor(firstName,pin);
 if (!actor) {attempts.set(key,{count:recent&&recent.until>now?recent.count+1:1,until:now+15*60*1000});return {error:'Incorrect name or PIN, or inactive account',status:401} as const;}
 attempts.delete(key);
 const user = await authDb.appUser.findUnique({where:{id:actor.employeeId}});
 if (!user || !user.active) return {error:'Inactive account',status:403} as const;
 const permissions = await permissionsFor(user.id,user.role);
 if (!permissions.includes(action)) return {error:'You do not have permission to perform this action.',status:403} as const;
 return {actor,user} as const;
}
