"use client";
import {useMemo,useState} from "react";
import {ArrowLeft,ArrowRight,CalendarDays,Gift,CheckCircle2} from "lucide-react";
import {DEFAULT_CATEGORIES,type CustomCategoryRow} from "@/lib/categories";
import {addDays,monday,occurs,type EventRow,type TaskRow} from "@/lib/schedule";
import {categoryCounts} from "@/lib/life-planning";
import style from "./weekly-review.module.css";

type Props={events:EventRow[];tasks:TaskRow[];categories?:CustomCategoryRow[];referenceDay:string};
const format=(d:string)=>new Date(d+"T12:00:00Z").toLocaleDateString("pt-BR",{timeZone:"UTC",day:"2-digit",month:"short"});
const keyFor=(x:{category?:string|null;custom_category_id?:string|null})=>x.custom_category_id?"custom:"+x.custom_category_id:(x.category||"personal");
export default function WeeklyLifeReview({events,tasks,categories=[],referenceDay}:Props){
 const [offset,setOffset]=useState(0);
 const first=useMemo(()=>addDays(monday(referenceDay),offset*7),[referenceDay,offset]);
 const last=addDays(first,6);
 const categoriesAll=useMemo(()=>[
   ...DEFAULT_CATEGORIES.map(c=>({key:c.id,label:c.label,color:c.color})),
   ...categories.map(c=>({key:"custom:"+c.id,label:c.name,color:c.color})),
 ],[categories]);
 const counts=useMemo(()=>categoryCounts(events,first,7),[events,first]);
 const totalEvents=Object.values(counts).reduce((n,v)=>n+v,0);
 const pending=tasks.filter(t=>t.status!=="done"&&t.due_date<=last);
 const inWeek=pending.filter(t=>t.due_date>=first);
 const overdue=pending.filter(t=>t.due_date<first);
 const importantEvents=Array.from({length:7},(_,i)=>addDays(first,i)).flatMap(day=>
   events.filter(e=>occurs(e,day)&&(e.category==="birthday"||e.category==="health"||e.category==="family")).map(e=>({...e,occurrenceDay:day}))).slice(0,6);
 const busiest=Array.from({length:7},(_,i)=>addDays(first,i)).map(day=>({day,count:events.filter(e=>occurs(e,day)).length})).sort((a,b)=>b.count-a.count)[0];
 return <section className={style.shell} aria-label="Revisão semanal de todas as áreas da vida">
  <div className={style.header}><div><span className={style.eyebrow}>REVISÃO SEMANAL · VIDA COMPLETA</span><h2>Sua semana em perspectiva</h2><p>Trabalho, saúde, encontros, estudos e lazer com a mesma importância.</p></div>
   <div className={style.nav}><button type="button" aria-label="Semana anterior" onClick={()=>setOffset(x=>x-1)}><ArrowLeft size={16}/></button><span>{format(first)} – {format(last)}</span><button type="button" aria-label="Semana seguinte" onClick={()=>setOffset(x=>x+1)}><ArrowRight size={16}/></button></div>
  </div>
  <div className={style.stats}><div><strong>{totalEvents}</strong><span>Compromissos</span></div><div><strong>{inWeek.length}</strong><span>Tarefas com prazo</span></div><div><strong>{overdue.length}</strong><span>Tarefas em atraso</span></div><div><strong>{busiest?.count||0}</strong><span>Compromissos no dia mais cheio</span></div></div>
  <div className={style.body}>
   <div><h3>Distribuição por categoria</h3><div className={style.categories}>
     {categoriesAll.filter(c=>counts[c.key]>0).map(c=><div key={c.key} className={style.category}><span><i style={{background:c.color}}/>{c.label}</span><b>{counts[c.key]}</b></div>)}
     {!totalEvents&&<p className={style.muted}>Ainda não há compromissos para esta semana.</p>}
    </div></div>
   <div><h3>O que merece atenção</h3>
    {inWeek.filter(t=>t.priority==="high").slice(0,3).map(t=><div className={style.note} key={t.id}><CheckCircle2 size={15}/><span>{t.title} · prazo {format(t.due_date)}</span></div>)}
    {overdue.slice(0,2).map(t=><div className={style.note} key={t.id}><CalendarDays size={15}/><span>{t.title} · prazo anterior à semana</span></div>)}
    {importantEvents.slice(0,4).map(e=><div className={style.note} key={e.id+"-"+e.occurrenceDay}><Gift size={15}/><span>{e.title} · {format(e.occurrenceDay)}</span></div>)}
    {!importantEvents.length&&!overdue.length&&!inWeek.some(t=>t.priority==="high")&&<p className={style.muted}>Sem pendências urgentes nem datas importantes identificadas.</p>}
   </div>
  </div>
  <p className={style.footer}>Esta revisão é informativa. O NEXO nunca altera seus horários ou prioridades automaticamente.</p>
 </section>
}
