import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, monday, occurs, overlaps, suggestedSlots, validClock, validDay } from '../lib/schedule.ts';

const todo = (extra={}) => ({ id:'t1',title:'Estudar',notes:'',due_date:'2026-11-05',duration_minutes:120,priority:'high',status:'todo',subject_id:null,...extra });
const event = (d,start,end,repeat=false,taskId=null) => ({id:'e1',title:'Compromisso',day:d,start_time:start,end_time:end,category:'class',repeat_weekly:repeat,task_id:taskId});
const mins = s => +s.slice(0,2)*60 + +s.slice(3,5);
test('valida datas e horas, incluindo datas inexistentes',()=>{assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2026-10-28'),true);assert.equal(validClock('25:10'),false);assert.equal(validClock('08:00'),true);});
test('semana começa segunda, inclusive passagem do mês',()=>{assert.equal(monday('2026-10-28'),'2026-10-26');assert.equal(addDays('2026-10-31',1),'2026-11-01');});
test('repetição respeita dia da semana e data inicial',()=>{let e=event('2026-10-28','09:00','10:00',true);assert.equal(occurs(e,'2026-11-04'),true);assert.equal(occurs(e,'2026-10-21'),false);assert.equal(occurs(e,'2026-10-29'),false);});
test('sugere blocos sem sobrepor aulas semanais',()=>{let e=event('2026-10-28','08:00','11:00',true);let s=suggestedSlots(todo(),[e],'2026-10-28','07:30');assert.ok(s.length>0);for(let x of s) if(occurs(e,x.day))assert.equal(overlaps(mins(x.start_time),mins(x.end_time),480,660),false);});
test('propostas cabem na jornada e não excedem duração total',()=>{let s=suggestedSlots(todo({duration_minutes:160}),[],'2026-10-28','08:00');assert.equal(s.reduce((a,x)=>a+mins(x.end_time)-mins(x.start_time),0),160);assert.ok(s.every(x=>mins(x.start_time)>=480&&mins(x.end_time)<=1260));});
test('o tempo agendado reduz sugestões',()=>{let s=suggestedSlots(todo({duration_minutes:120}),[event('2026-10-28','10:00','11:30',false,'t1')],'2026-10-28','08:00');assert.equal(s.reduce((a,x)=>a+mins(x.end_time)-mins(x.start_time),0),30);});
test('não sugere para tarefa concluída ou prazo vencido',()=>{assert.deepEqual(suggestedSlots(todo({status:'done'}),[],'2026-10-28','08:00'),[]);assert.deepEqual(suggestedSlots(todo({due_date:'2026-10-27'}),[],'2026-10-28','08:00'),[]);});
test('dia lotado faz avançar para o próximo dia disponível',()=>{let e=event('2026-10-28','08:00','21:00');let s=suggestedSlots(todo({duration_minutes:60}),[e],'2026-10-28','07:00');assert.equal(s[0].day,'2026-10-29');});
