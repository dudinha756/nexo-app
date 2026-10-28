import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/auth-server';
import {sql} from '@/lib/database';
import {validDay} from '@/lib/schedule';
export const runtime='nodejs';
const failure=(message:string,status=400)=>NextResponse.json({error:message},{status});
const validTime=(v:unknown)=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const validZone=(z:string)=>{try{new Intl.DateTimeFormat('en-US',{timeZone:z});return true}catch{return false}};
const localDate=(zone:string)=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date());const kv=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${kv.year}-${kv.month}-${kv.day}`};
const defaults={briefing_time:'07:00',timezone:'America/Fortaleza',enabled:false,browser_alerts:false,last_acknowledged_date:null};
async function uid(){return(await auth.getSession()).data?.user?.id||null}
async function getPrefs(u:string){const rows=await sql`SELECT briefing_time,timezone,enabled,browser_alerts,last_acknowledged_date::text FROM nexo_briefing_preferences WHERE user_id=${u}`;return rows[0]||defaults}
export async function GET(){try{const u=await uid();if(!u)return failure('Faça login para acessar seu resumo.',401);return NextResponse.json({preferences:await getPrefs(u)},{headers:{'Cache-Control':'no-store'}})}catch(e){console.error(e);return failure('Falha ao carregar o resumo.',500)}}
export async function POST(req:NextRequest){try{
 const u=await uid();if(!u)return failure('Faça login novamente.',401);const b=await req.json();
 if(b.action==='savePreferences'){
  const timezone=String(b.timezone||'America/Fortaleza');if(!validTime(b.time)||timezone.length>64||!validZone(timezone)||typeof b.enabled!=='boolean'||typeof b.browserAlerts!=='boolean')return failure('Horário ou preferências inválidos.');
  const rows=await sql`INSERT INTO nexo_briefing_preferences(user_id,briefing_time,timezone,enabled,browser_alerts,updated_at) VALUES(${u},${b.time},${timezone},${b.enabled},${b.browserAlerts},now()) ON CONFLICT(user_id) DO UPDATE SET briefing_time=EXCLUDED.briefing_time,timezone=EXCLUDED.timezone,enabled=EXCLUDED.enabled,browser_alerts=EXCLUDED.browser_alerts,updated_at=now() RETURNING briefing_time,timezone,enabled,browser_alerts,last_acknowledged_date::text`;
  return NextResponse.json({preferences:rows[0]});
 }
 if(b.action==='acknowledge'){const p=await getPrefs(u);const date=localDate(String(p.timezone));const rows=await sql`INSERT INTO nexo_briefing_preferences(user_id,last_acknowledged_date) VALUES(${u},${date}) ON CONFLICT(user_id) DO UPDATE SET last_acknowledged_date=EXCLUDED.last_acknowledged_date,updated_at=now() RETURNING last_acknowledged_date::text`;return NextResponse.json({ok:true,date:rows[0].last_acknowledged_date});}
 if(b.action==='editTask'){
  const id=String(b.id||''),title=String(b.title||'').trim(),notes=String(b.notes||'').trim(),duration=Number(b.durationMinutes);
  if(!/^[a-f0-9-]{36}$/i.test(id)||!title||title.length>180||notes.length>1000||!validDay(b.dueDate)||!Number.isInteger(duration)||duration<15||duration>600||!['low','medium','high'].includes(b.priority))return failure('Revise os dados da tarefa.');
  const rows=await sql`UPDATE nexo_tasks SET title=${title},notes=${notes},due_date=${b.dueDate},duration_minutes=${duration},priority=${b.priority} WHERE user_id=${u} AND id=${id} RETURNING id`;
  return rows.length?NextResponse.json({ok:true}):failure('Tarefa não encontrada.',404);
 }
 return failure('Ação não reconhecida.');
}catch(e){console.error('briefing',e);return failure('Não foi possível salvar.',500)}}
