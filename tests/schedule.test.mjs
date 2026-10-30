import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, monday, occurs, overlaps, suggestedSlots, potentialEventConflicts, validClock, validDay } from '../lib/schedule.ts';

const todo = (extra={}) => ({ id:'t1',title:'Estudar',notes:'',due_date:'2026-11-05',duration_minutes:120,priority:'high',status:'todo',subject_id:null,...extra });
const event = (d,start,end,repeat=false,taskId=null) => ({id:'e1',title:'Compromisso',day:d,start_time:start,end_time:end,category:'class',repeat_weekly:repeat,task_id:taskId});
import { DEFAULT_CATEGORIES, isDefaultCategory, taskCategory, validCategoryName, validCategoryColor, validCategoryIcon } from '../lib/categories.ts';
const mins = s => +s.slice(0,2)*60 + +s.slice(3,5);
test('valida datas e horas, incluindo datas inexistentes',()=>{assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2026-10-28'),true);assert.equal(validClock('25:10'),false);assert.equal(validClock('08:00'),true);});
test('semana começa segunda, inclusive passagem do mês',()=>{assert.equal(monday('2026-10-28'),'2026-10-26');assert.equal(addDays('2026-10-31',1),'2026-11-01');});
test('repetição respeita dia da semana e data inicial',()=>{let e=event('2026-10-28','09:00','10:00',true);assert.equal(occurs(e,'2026-11-04'),true);assert.equal(occurs(e,'2026-10-21'),false);assert.equal(occurs(e,'2026-10-29'),false);});
test('sugere blocos sem sobrepor aulas semanais',()=>{let e=event('2026-10-28','08:00','11:00',true);let s=suggestedSlots(todo(),[e],'2026-10-28','07:30');assert.ok(s.length>0);for(let x of s) if(occurs(e,x.day))assert.equal(overlaps(mins(x.start_time),mins(x.end_time),480,660),false);});
test('propostas cabem na jornada e não excedem duração total',()=>{let s=suggestedSlots(todo({duration_minutes:160}),[],'2026-10-28','08:00');assert.equal(s.reduce((a,x)=>a+mins(x.end_time)-mins(x.start_time),0),160);assert.ok(s.every(x=>mins(x.start_time)>=480&&mins(x.end_time)<=1260));});
test('o tempo agendado reduz sugestões',()=>{let s=suggestedSlots(todo({duration_minutes:120}),[event('2026-10-28','10:00','11:30',false,'t1')],'2026-10-28','08:00');assert.equal(s.reduce((a,x)=>a+mins(x.end_time)-mins(x.start_time),0),30);});
test('não sugere para tarefa concluída ou prazo vencido',()=>{assert.deepEqual(suggestedSlots(todo({status:'done'}),[],'2026-10-28','08:00'),[]);assert.deepEqual(suggestedSlots(todo({due_date:'2026-10-27'}),[],'2026-10-28','08:00'),[]);});
test('dia lotado faz avançar para o próximo dia disponível',()=>{let e=event('2026-10-28','08:00','21:00');let s=suggestedSlots(todo({duration_minutes:60}),[e],'2026-10-28','07:00');assert.equal(s[0].day,'2026-10-29');});

test('categorias padrão contemplam toda a vida e preservam identificadores antigos',()=>{
 const ids=DEFAULT_CATEGORIES.map(c=>c.id);
 for(const id of ['work','class','training','personal','study','birthday','dining','friends','family','health','leisure','other']) assert.ok(ids.includes(id));
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(DEFAULT_CATEGORIES.every(c=>isDefaultCategory(c.id)&&validCategoryColor(c.color)&&validCategoryIcon(c.icon)));
 assert.equal(isDefaultCategory('unknown'),false);
});
test('categoria de tarefas antigas preserva vínculo acadêmico sem atualizar registros',()=>{
 assert.equal(taskCategory(null,'subject-id'),'study');
 assert.equal(taskCategory(null,null),'personal');
 assert.equal(taskCategory('training','subject-id'),'training');
 assert.equal(validCategoryName('  Treinos de corrida  '),true);
 assert.equal(validCategoryName(' '),false);
});
test('sugestões respeitam trabalho, treino, jantar e compromisso anual igualmente',()=>{
 const events=[
  {...event('2026-10-29','08:00','16:00'),id:'work',category:'work'},
  {...event('2026-10-29','16:00','17:30'),id:'gym',category:'training'},
  {...event('2026-10-29','18:00','20:00'),id:'dinner',category:'dining'},
  {...event('2025-10-29','20:00','21:00'),id:'birthday',category:'birthday',repeat_yearly:true}
 ];
 const slots=suggestedSlots(todo({due_date:'2026-10-30',duration_minutes:60}),events,'2026-10-29','07:00');
 for(const slot of slots) for(const e of events) if(occurs(e,slot.day)) assert.equal(overlaps(mins(slot.start_time),mins(slot.end_time),mins(e.start_time),mins(e.end_time)),false);
});
test('compromissos de dia inteiro não bloqueiam artificialmente a agenda',()=>{
 const annual={...event('2025-10-29','09:00','09:15'),category:'birthday',repeat_yearly:true,all_day:true};
 const slots=suggestedSlots(todo({due_date:'2026-10-29',duration_minutes:60}),[annual],'2026-10-29','07:00');
 assert.equal(slots[0].start_time,'08:00');
});
test('detecta conflito de treino semanal com jantar pontual sem alterar eventos',()=>{
 const gym={...event('2026-10-29','18:00','19:00',true),id:'gym',title:'Treino',category:'training'};
 const dinner={...event('2026-11-05','18:30','20:00'),id:'dinner',title:'Jantar',category:'dining'};
 const snapshot=JSON.stringify([gym,dinner]);
 const conflicts=potentialEventConflicts(gym,[dinner]);
 assert.equal(conflicts.length,1);
 assert.equal(conflicts[0].day,'2026-11-05');
 assert.equal(JSON.stringify([gym,dinner]),snapshot);
});
test('ignora colisões inexistentes e eventos anuais de dia inteiro',()=>{
 const birthday={...event('2025-11-05','09:00','09:15'),id:'b',repeat_yearly:true,all_day:true};
 const candidate={...event('2026-11-05','09:00','10:00'),id:'c'};
 assert.deepEqual(potentialEventConflicts(candidate,[birthday]),[]);
 const timed={...birthday,all_day:false,start_time:'09:30',end_time:'10:00'};
 assert.equal(potentialEventConflicts(candidate,[timed]).length,1);
});

test('detecta colisão futura ao editar série semanal iniciada anos antes',()=>{
 const recurring={...event('2022-10-28','18:00','19:00',true),id:'old-gym',category:'training'};
 const dinner={...event('2026-11-06','18:30','20:00'),id:'dinner',category:'dining'};
 const collisions=potentialEventConflicts(recurring,[dinner],'2026-10-30');
 assert.equal(collisions.length,1);
 assert.equal(collisions[0].day,'2026-11-06');
});
test('repetição anual antiga verifica próxima ocorrência e ignora dia inteiro',()=>{
 const annual={...event('2020-11-10','19:00','20:00'),id:'anniversary',repeat_yearly:true,category:'family'};
 const dinner={...event('2026-11-10','19:30','21:00'),id:'dinner',category:'dining'};
 assert.equal(potentialEventConflicts(annual,[dinner],'2026-10-30')[0]?.day,'2026-11-10');
 assert.deepEqual(potentialEventConflicts({...annual,all_day:true},[dinner],'2026-10-30'),[]);
});
