import {occurs,minutes,type EventRow} from "./schedule.ts";
import {normalizeReminderSettings,type ReminderSettings} from "./reminder-policy.ts";

export type PushPrefs=ReminderSettings;
export type PushCandidate={reminderKey:string;localDay:string;title:string;body:string;url:string;kind:"event"|"briefing"};
export type BriefingSetting={enabled:boolean;briefing_time:string;timezone:string;last_acknowledged_date?:string|null};

export function validPushZone(z:unknown):z is string {
 if(typeof z!=="string"||z.length>64)return false;
 try{new Intl.DateTimeFormat("en-US",{timeZone:z});return true}catch{return false}
}
export function localClock(at:Date,timezone:string):{day:string;minute:number} {
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:timezone,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).formatToParts(at);
 const kv=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return {day:kv.year+"-"+kv.month+"-"+kv.day,minute:Number(kv.hour)*60+Number(kv.minute)};
}
export function pushForEvent(e:EventRow,prefs:PushPrefs,timezone:string,at:Date):PushCandidate|null {
 if(!prefs.enabled || !validPushZone(timezone))return null;
 const key=e.custom_category_id?"custom:"+e.custom_category_id:e.category;
 if(!prefs.categories.includes(key))return null;
 const local=localClock(at,timezone);
 if(!occurs(e,local.day))return null;
 if(e.all_day){
  // No false 09:00 time is imposed on annual birthdays or all-day activities.
  if(local.minute<8*60 || local.minute>12*60)return null;
 }else{
  const until=minutes(e.start_time)-local.minute;
  if(until<0||until>prefs.lead)return null;
 }
 return {
  reminderKey:"event:"+e.id+":"+local.day,localDay:local.day,
  title:e.all_day?"NEXO · Data importante":"NEXO · Compromisso próximo",
  body:e.all_day?e.title+" é hoje.":e.title+" começa às "+e.start_time,
  url:"/vida",kind:"event"
 };
}
export function pushForBriefing(pref:BriefingSetting,at:Date):PushCandidate|null {
 if(!pref.enabled||!validPushZone(pref.timezone)||!/^\d{2}:\d{2}$/.test(pref.briefing_time))return null;
 const local=localClock(at,pref.timezone);
 const atMinute=minutes(pref.briefing_time);
 // A late scheduler must not send a daily greeting hours late.
 if(local.minute<atMinute||local.minute-atMinute>20||pref.last_acknowledged_date===local.day)return null;
 return {reminderKey:"briefing:"+local.day,localDay:local.day,title:"NEXO · Seu resumo diário",body:"Sua programação de hoje está pronta. Deseja confirmar ou ajustar os compromissos?",url:"/resumo",kind:"briefing"};
}
export function validatePushSettings(prefs:unknown):PushPrefs|null {
 const parsed=normalizeReminderSettings(prefs);
 if(!parsed||parsed.categories.length>100||parsed.categories.some(c=>c.length>80))return null;
 return parsed;
}
