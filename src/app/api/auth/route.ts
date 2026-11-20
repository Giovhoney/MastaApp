// Self-registration is disabled. Employee accounts are managed by verified administrators.
export async function PUT() {
 return Response.json({error:"Self-registration is disabled. Contact an administrator."},{status:403,headers:{"Cache-Control":"no-store"}});
}
