import {test} from "node:test";
import assert from "node:assert/strict";
import {pushForEvent,pushForBriefing,localClock,validPushZone,validatePushSettings} from "../lib/push-policy.ts";
const pref={enabled:true,lead:30,maxDaily:5,categories:["work","birthday"]};
const event={id:"e1",day:"2026-11-03",start_time:"19:00",end_time:"20:00",title:"Reunião",category:"work",repeat_weekly:false,repeat_yearly:false,all_day:false,task_id:null};
test("usa horário local de Fortaleza e envio 30 minutos antes",()=>{
 assert.equal(localClock(new Date("2026-11-03T21:35:00Z"),"America/Fortaleza").minute,1115);
 assert.equal(pushForEvent(event,pref,"America/Fortaleza",new Date("2026-11-03T21:35:00Z")).kind,"event");
 assert.equal(pushForEvent(event,pref,"America/Fortaleza",new Date("2026-11-03T21:00:00Z")),null);
 assert.equal(pushForEvent(event,pref,"America/Fortaleza",new Date("2026-11-03T22:03:00Z")),null);
});
test("respeita recorrências semanais, categorias e opção de desativar",()=>{
 const e={...event,day:"2026-10-27",repeat_weekly:true};
 assert.ok(pushForEvent(e,pref,"America/Fortaleza",new Date("2026-11-03T21:40:00Z")));
 assert.equal(pushForEvent(e,{...pref,categories:["health"]},"America/Fortaleza",new Date("2026-11-03T21:40:00Z")),null);
 assert.equal(pushForEvent(e,{...pref,enabled:false},"America/Fortaleza",new Date("2026-11-03T21:40:00Z")),null);
});
test("aniversários anuais de dia inteiro não recebem hora fictícia",()=>{
 const birthday={...event,day:"2024-11-03",all_day:true,repeat_yearly:true,category:"birthday",title:"Aniversário da Lis"};
 const r=pushForEvent(birthday,pref,"America/Fortaleza",new Date("2026-11-03T12:00:00Z"));
 assert.ok(r);assert.equal(r.body,"Aniversário da Lis é hoje.");
 assert.equal(pushForEvent(birthday,pref,"America/Fortaleza",new Date("2026-11-02T12:00:00Z")),null);
});
test("briefing respeita hora, fuso e dia já confirmado",()=>{
 const p={enabled:true,briefing_time:"07:00",timezone:"America/Fortaleza",last_acknowledged_date:null};
 const d=new Date("2026-11-03T10:07:00Z");
 assert.equal(pushForBriefing(p,d).kind,"briefing");
 assert.equal(pushForBriefing({...p,last_acknowledged_date:"2026-11-03"},d),null);
 assert.equal(pushForBriefing(p,new Date("2026-11-03T12:00:00Z")),null);
});
test("valida preferências e timezone",()=>{
 assert.equal(validPushZone("invalid/zone"),false);
 assert.equal(validatePushSettings({...pref,lead:12}),null);
 assert.equal(validatePushSettings(pref)?.maxDaily,5);
});
