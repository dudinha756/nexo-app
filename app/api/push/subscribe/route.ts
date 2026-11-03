import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth-server";
import {sql} from "@/lib/database";
import {validPushZone,validatePushSettings} from "@/lib/push-policy";
import {validPushEndpoint,pushClient,publicVapidKey,asSubscription} from "@/lib/push-server";

export const runtime="nodejs";
const fail=(error:string,status=400)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
const base64url=(s:unknown,min:number,max:number)=>typeof s==="string"&&s.length>=min&&s.length<=max&&/^[A-Za-z0-9_-]+$/.test(s);
async function currentUser(){const x=await auth.getSession();return x.data?.user?.id||null;}

export async function GET(){
 const id=await currentUser();
 if(!id)return fail("Faça login para configurar as notificações.",401);
 return NextResponse.json({configured:!!(publicVapidKey()&&process.env.VAPID_PRIVATE_KEY),publicKey:publicVapidKey()},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:NextRequest){
 try{
  const uid=await currentUser();
  if(!uid)return fail("Faça login para configurar as notificações.",401);
  const b=await req.json();
  const action=String(b?.action||"");
  const endpoint=String(b?.endpoint||b?.subscription?.endpoint||"");
  if(!validPushEndpoint(endpoint))return fail("Este navegador não forneceu um serviço push válido.");
  if(action==="status"){
   const rows=await sql`SELECT enabled,settings,timezone FROM nexo_push_subscriptions WHERE user_id=${uid} AND endpoint=${endpoint}`;
   return NextResponse.json({active:!!rows[0]?.enabled,settings:rows[0]?.settings||null,timezone:rows[0]?.timezone||null},{headers:{"Cache-Control":"no-store"}});
  }
  if(action==="unsubscribe"){
   await sql`DELETE FROM nexo_push_subscriptions WHERE user_id=${uid} AND endpoint=${endpoint}`;
   return NextResponse.json({ok:true});
  }
  if(action==="subscribe"){
   if(!process.env.VAPID_PRIVATE_KEY)return fail("As notificações push ainda não foram configuradas no servidor.",503);
   const p=b.subscription,settings=validatePushSettings(b.settings),zone=b.timezone;
   const key=p?.keys?.p256dh,authKey=p?.keys?.auth;
   if(!settings?.enabled||!validPushZone(zone)||!base64url(key,70,200)||!base64url(authKey,12,120))return fail("Revise o dispositivo e as preferências de notificações.");
   const matching=await sql`SELECT user_id,p256dh,auth FROM nexo_push_subscriptions WHERE endpoint=${endpoint}`;
   // Reassign only if the browser proves knowledge of its existing subscription keys.
   if(matching.length&&(matching[0].p256dh!==key||matching[0].auth!==authKey))return fail("Este dispositivo tem outra inscrição push. Desative-a e tente novamente.",409);
   if(!matching.length){
    const counts=await sql`SELECT count(*)::int AS n FROM nexo_push_subscriptions WHERE user_id=${uid}`;
    if(Number(counts[0].n)>=8)return fail("Limite de oito dispositivos conectados. Desative um dispositivo antes de continuar.",409);
   }
   // Reusing the same browser for a different account must not inherit
   // the prior account's delivery counters or daily briefing markers.
   if(matching.length&&matching[0].user_id!==uid){
    await sql`DELETE FROM nexo_push_deliveries
      WHERE subscription_id=(SELECT id FROM nexo_push_subscriptions WHERE endpoint=${endpoint})`;
   }
   const settingsJson=JSON.stringify(settings);
   await sql`INSERT INTO nexo_push_subscriptions(user_id,endpoint,p256dh,auth,timezone,settings,enabled,updated_at)
    VALUES(${uid},${endpoint},${key},${authKey},${zone},${settingsJson}::jsonb,true,now())
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,
      timezone=EXCLUDED.timezone,settings=EXCLUDED.settings,enabled=true,updated_at=now()`;
   return NextResponse.json({ok:true,active:true});
  }
  if(action==="preferences"){
   const settings=validatePushSettings(b.settings);
   if(!settings)return fail("Preferências inválidas.");
   const settingsJson=JSON.stringify(settings);
   const rows=await sql`UPDATE nexo_push_subscriptions
     SET settings=${settingsJson}::jsonb,enabled=${settings.enabled},updated_at=now()
     WHERE endpoint=${endpoint} AND user_id=${uid} RETURNING id`;
   return rows.length?NextResponse.json({ok:true}):fail("Ative o push neste dispositivo primeiro.",404);
  }
  if(action==="test"){
   const rows=await sql`UPDATE nexo_push_subscriptions SET last_test_at=now()
    WHERE endpoint=${endpoint} AND user_id=${uid} AND enabled=true
      AND (last_test_at IS NULL OR last_test_at < now()-interval '60 seconds')
    RETURNING endpoint,p256dh,auth`;
   if(!rows.length)return fail("Teste disponível a cada 60 segundos em um dispositivo ativo.",429);
   try{
    await pushClient().sendNotification(asSubscription(rows[0] as {endpoint:string;p256dh:string;auth:string}),
       JSON.stringify({title:"NEXO · Push funcionando",body:"Você receberá lembretes mesmo com o NEXO fechado, quando o sistema permitir.",url:"/vida",key:"test:"+Date.now()}),
       {TTL:180,urgency:"high"});
    return NextResponse.json({ok:true});
   }catch(e){
    const status=(e as {statusCode?:number}).statusCode||502;
    if(status===404||status===410)await sql`DELETE FROM nexo_push_subscriptions WHERE endpoint=${endpoint} AND user_id=${uid}`;
    console.error("nexo/push/test failed",status);
    return fail("O serviço push recusou o teste. Verifique a autorização neste dispositivo.",502);
   }
  }
  return fail("Ação de notificações não reconhecida.");
 }catch(e){console.error("nexo/push/preferences",e);return fail("Falha ao configurar notificações. Tente novamente.",500)}
}
