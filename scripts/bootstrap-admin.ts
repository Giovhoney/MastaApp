import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
const db=new PrismaClient();
const scrypt=promisify(scryptCallback);
async function main(){
 const [name,pin]=await new Promise<string[]>((resolve,reject)=>{
  let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',()=>resolve(input.trimEnd().split('\n')));process.stdin.on('error',reject);
 });
 if(!name || !/^[\p{L}][\p{L}' -]{0,39}$/u.test(name.trim()) || !/^\d{6}$/.test(pin??''))throw Error('Provide a valid name and 6-digit PIN');
 if(await db.appUser.count({where:{role:'ADMIN',active:true}}))throw Error('An active administrator already exists. Bootstrap is disabled.');
 const salt=randomBytes(16).toString('hex');const hash=await scrypt(pin,salt,64) as Buffer;
 await db.appUser.create({data:{displayName:name.trim(),role:'ADMIN',credential:{create:{firstNameKey:name.trim().toLowerCase(),pinHash:`${salt}:${hash.toString('hex')}`}}}});
 console.log('Initial administrator created. PIN was not printed or stored in plaintext.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>db.$disconnect());
