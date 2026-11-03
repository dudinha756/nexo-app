import {NextRequest,NextResponse} from "next/server";
import {createRemoteJWKSet,jwtVerify} from "jose";
import {sql} from "@/lib/database";
import {pushClient,asSubscription} from "@/lib/push-server";
import {pushForEvent,pushForBriefing,validatePushSettings,validPushZone,type PushCandidate} from "@/lib/push-policy";
import type {EventRow} from "@/lib/schedule";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const issuer="https://token.actions.githubusercontent.com";
const audience="nexo-push-dispatch";
const workflow="dudinha756/nexo-app/.github/workflows/push-reminders.yml@refs/heads/main";
const keys=createRemoteJWKSet(new URL(issuer+"/.well-known/jwks"));
type Subscription={id:string;user_id:string;endpoint:string;p256dh:string;auth:string;timezone:string;settings:unknown};
type EventResult=Subscription & {event_id:string;title:string;day:string;start_time:string;end_time:string;category:string;custom_category_id:string|null;repeat_weekly:boolean;repeat_yearly:boolean;all_day:boolean;task_id:string|null};
type BriefingResult=Subscription & {briefing_time:string;briefing_timezone:string;briefing_enabled:boolean;last_acknowledged_date:string|null};
const forbidden=()=>NextResponse.json({error:"Acesso não autorizado."},{status:401,headers:{"Cache-Control":"no-store"}});
async function verifiedScheduler(req:NextRequest){
 const token=req.headers.get("authorization")||"";
 if(!token.startsWith("Bearer "))return false;
 try{
  const result=await jwtVerify(token.slice(7),keys,{issuer,audience,algorithms:["RS256"]});
  const claims=result.payload as Record<string,unknown>;
  return claims.repository==="dudinha756/nexo-app" &&
   claims.ref==="refs/heads/main" &&
   claims.workflow_ref===workflow &&
   (claims.event_name==="schedule"||claims.event_name==="workflow_dispatch"||claims.event_name==="push");
 }catch{return false}
}
export async function POST(req:NextRequest){
 if(!await verifiedScheduler(req))return forbidden();
 if(!process.env.VAPID_PRIVATE_KEY||!process.env.VAPID_PUBLIC_KEY)return NextResponse.json({error:"Push não configurado"},{status:503});
 try{
  const at=new Date();
  const rawEvents=await sql`SELECT s.id,s.user_id,s.endpoint,s.p256dh,s.auth,s.timezone,s.settings,
    e.id AS event_id,e.title,e.day::text AS day,
    to_char(e.start_time,'HH24:MI') AS start_time,to_char(e.end_time,'HH24:MI') AS end_time,
    COALESCE(e.category_key,e.category) AS category,e.custom_category_id,e.repeat_weekly,e.repeat_yearly,e.all_day,e.task_id
    FROM nexo_push_subscriptions s
    JOIN nexo_events e ON e.user_id=s.user_id
    LEFT JOIN nexo_tasks t ON e.task_id=t.id AND t.user_id=s.user_id
    WHERE s.enabled=true AND (e.task_id IS NULL OR t.status!='done')
    AND (e.repeat_weekly=true OR e.repeat_yearly=true OR e.day BETWEEN (CURRENT_DATE - 1) AND (CURRENT_DATE + 2))
    ORDER BY s.id,e.day LIMIT 2000`;
  const rawBriefings=await sql`SELECT s.id,s.user_id,s.endpoint,s.p256dh,s.auth,s.timezone,s.settings,
    b.briefing_time,b.timezone AS briefing_timezone,b.enabled AS briefing_enabled,b.last_acknowledged_date::text
    FROM nexo_push_subscriptions s
    JOIN nexo_briefing_preferences b ON b.user_id=s.user_id
    WHERE s.enabled=true AND b.enabled=true ORDER BY s.id LIMIT 500`;
  const logs=await sql`SELECT subscription_id,local_day::text AS day,count(*)::int AS n
    FROM nexo_push_deliveries
    WHERE sent_at IS NOT NULL AND local_day BETWEEN CURRENT_DATE - 2 AND CURRENT_DATE + 2
    GROUP BY subscription_id,local_day`;
  const counts=new Map<string,number>();
  for(const row of logs)counts.set(String(row.subscription_id)+":"+row.day,Number(row.n));
  const client=pushClient();
  let scanned=0,sent=0,expired=0,failed=0,skipped=0;
  const seen=new Set<string>();
  const removed=new Set<string>();
  async function deliver(subscription:Subscription,reminder:PushCandidate) {
   if(removed.has(subscription.id))return;
   const settings=validatePushSettings(subscription.settings);
   if(!settings?.enabled)return;
   const unique=subscription.id+":"+reminder.reminderKey;
   if(seen.has(unique))return;seen.add(unique);
   const countKey=subscription.id+":"+reminder.localDay;
   const daily=counts.get(countKey)||0;
   if(daily>=settings.maxDaily){skipped++;return}
   const record=await sql`INSERT INTO nexo_push_deliveries(subscription_id,reminder_key,local_day)
     VALUES(${subscription.id},${reminder.reminderKey},${reminder.localDay})
     ON CONFLICT(subscription_id,reminder_key) DO NOTHING RETURNING id`;
   if(!record.length)return;
   try{
    const payload=JSON.stringify({title:reminder.title,body:reminder.body,url:reminder.url,key:reminder.reminderKey});
    await client.sendNotification(asSubscription(subscription),payload,{TTL:3600,urgency:"normal"});
    await sql`UPDATE nexo_push_deliveries SET sent_at=now() WHERE id=${record[0].id}`;
    sent++;counts.set(countKey,daily+1);
   }catch(err){
    const status=(err as {statusCode?:number}).statusCode||0;
    if(status===404||status===410){
     removed.add(subscription.id);
     await sql`DELETE FROM nexo_push_subscriptions WHERE id=${subscription.id}`;
     expired++;
    }else{
     await sql`DELETE FROM nexo_push_deliveries WHERE id=${record[0].id}`;
     console.error("nexo/push/dispatch delivery error",status);
     failed++;
    }
   }
  }
  for(const row of rawEvents){
   scanned++;
   const subscription=row as EventResult;
   if(!validPushZone(subscription.timezone))continue;
   const preferences=validatePushSettings(subscription.settings);
   if(!preferences)continue;
   const event:EventRow={id:subscription.event_id,title:subscription.title,day:subscription.day,start_time:subscription.start_time,end_time:subscription.end_time,category:subscription.category,custom_category_id:subscription.custom_category_id,repeat_weekly:subscription.repeat_weekly,repeat_yearly:subscription.repeat_yearly,all_day:subscription.all_day,task_id:subscription.task_id};
   const candidate=pushForEvent(event,preferences,subscription.timezone,at);
   if(candidate)await deliver(subscription,candidate);
  }
  for(const row of rawBriefings){
   scanned++;
   const sub=row as BriefingResult;
   const reminder=pushForBriefing({enabled:sub.briefing_enabled,briefing_time:sub.briefing_time,timezone:sub.briefing_timezone,last_acknowledged_date:sub.last_acknowledged_date},at);
   if(reminder)await deliver(sub,reminder);
  }
  return NextResponse.json({ok:true,scanned,sent,expired,failed,skipped},{headers:{"Cache-Control":"no-store"}});
 }catch(err){
  console.error("nexo/push/dispatch",err);
  return NextResponse.json({error:"Falha ao verificar os avisos."},{status:500,headers:{"Cache-Control":"no-store"}});
 }
}
