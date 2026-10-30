"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {ArrowLeft,ArrowRight,CalendarDays,Check,CheckCircle2,Clock,Edit3,Plus,RefreshCw,Save,Bell,BookOpen,LifeBuoy,Sparkles,X,AlertTriangle,BriefcaseBusiness,Dumbbell,GraduationCap,Cake,Utensils,Users,HeartHandshake,HeartPulse,Sun,Tag,Plane,Camera,ShoppingBag,Music,type LucideIcon} from "lucide-react";
import {authClient} from "@/lib/auth-client";
import {DEFAULT_CATEGORIES,type CustomCategoryRow} from "@/lib/categories";
import {addDays,monday,occurs,minutes,type EventRow,type TaskRow} from "@/lib/schedule";
import {alternativeTimes,categoryCounts} from "@/lib/life-planning";
import st from "./vida.module.css";

type Payload={events:EventRow[];tasks:TaskRow[];categories:CustomCategoryRow[]};
type EventForm={title:string;day:string;startTime:string;endTime:string;category:string;repeatWeekly:boolean;repeatYearly:boolean;allDay:boolean};
type TaskForm={title:string;dueDate:string;durationMinutes:number;priority:"low"|"medium"|"high";category:string;notes:string};
type ReminderSettings={enabled:boolean;lead:number;categories:string[]};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const dailyDate=(d:string)=>new Date(d+"T12:00:00Z").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",timeZone:"UTC"});
const eventDefaults=():EventForm=>({title:"",day:today(),startTime:"09:00",endTime:"10:00",category:"personal",repeatWeekly:false,repeatYearly:false,allDay:false});
const taskDefaults=():TaskForm=>({title:"",dueDate:today(),durationMinutes:60,priority:"medium",category:"personal",notes:""});
const reminderDefaults:ReminderSettings={enabled:false,lead:30,categories:DEFAULT_CATEGORIES.map(c=>c.id)};
const ICONS:Record<string,LucideIcon>={"briefcase-business":BriefcaseBusiness,"dumbbell":Dumbbell,"graduation-cap":GraduationCap,"book-open":BookOpen,"calendar-days":CalendarDays,"cake":Cake,"utensils":Utensils,"users":Users,"heart-handshake":HeartHandshake,"heart-pulse":HeartPulse,"sun":Sun,"tag":Tag,"plane":Plane,"camera":Camera,"shopping-bag":ShoppingBag,"music":Music};
function CategoryIcon({icon}:{icon:string}){const Icon=ICONS[icon]||Tag;return <Icon size={13} aria-hidden="true"/>;}
const iconChoices=[["tag","Marcador"],["plane","Viagens"],["camera","Fotografia"],["shopping-bag","Compras"],["music","Música"],["heart-pulse","Saúde"],["briefcase-business","Trabalho"],["dumbbell","Exercícios"],["book-open","Leitura"],["cake","Comemorações"],["utensils","Gastronomia"],["sun","Lazer"]];
const weekLabels=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const catKey=(e:{category?:string|null;custom_category_id?:string|null})=>e.custom_category_id?"custom:"+e.custom_category_id:(e.category||"personal");
const encodeCat=(value:string)=>value.startsWith("custom:")?{category:"other",customCategoryId:value.slice(7)}:{category:value,customCategoryId:null};
async function api(action:string,values:Record<string,unknown>={}){
 const r=await fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...values})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||"Não foi possível concluir.");
 return data;
}
export default function LifePage(){
 const [data,setData]=useState<Payload>({events:[],tasks:[],categories:[]});
 const [loading,setLoading]=useState(true),[unauthorized,setUnauthorized]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [userId,setUserId]=useState(""),[selectedDate,setSelectedDate]=useState(today),[week,setWeek]=useState(()=>monday(today()));
 const [filter,setFilter]=useState("all"),[mode,setMode]=useState<"event"|"task"|"category"|null>(null);
 const [editingEvent,setEditingEvent]=useState<string|null>(null),[editingCategory,setEditingCategory]=useState<string|null>(null);
 const [form,setForm]=useState<EventForm>(eventDefaults),[task,setTask]=useState<TaskForm>(taskDefaults);
 const [categoryForm,setCategoryForm]=useState({name:"",color:"#8d7ab0",icon:"tag"});
 const [alternatives,setAlternatives]=useState<{day:string;start_time:string;end_time:string}[]>([]);
 const [planTask,setPlanTask]=useState(""),[planned,setPlanned]=useState<{day:string;start_time:string;end_time:string}[]>([]);
 const [prefs,setPrefs]=useState<ReminderSettings>(reminderDefaults),[prefsReady,setPrefsReady]=useState(false);
 const read=useCallback(async()=>{
  try{
   const r=await fetch("/api/data",{cache:"no-store"});
   if(r.status===401){setUnauthorized(true);setLoading(false);return}
   const p=await r.json();if(!r.ok)throw Error(p.error||"Não foi possível carregar.");
   setData({events:p.events||[],tasks:p.tasks||[],categories:p.categories||[]});setUnauthorized(false);setError("");
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{read();authClient.getSession().then(r=>setUserId(r.data?.user?.id||"")).catch(()=>{})},[read]);
 useEffect(()=>{
  // Preferences belong to the signed-in user, not the previous account.
  setPrefs({...reminderDefaults,categories:[...reminderDefaults.categories]});
  setPrefsReady(false);
  if(!userId)return;
  try{
   const raw=localStorage.getItem("nexo:life-reminders:"+userId);
   if(raw){const p=JSON.parse(raw);if(p&&typeof p.enabled==="boolean"&&[15,30,60].includes(p.lead)&&Array.isArray(p.categories))setPrefs(p)}
  }catch{}
  setPrefsReady(true);
 },[userId]);
 const allCats=useMemo(()=>[
  ...DEFAULT_CATEGORIES.map(c=>({key:c.id,label:c.label,color:c.color,icon:c.icon})),
  ...data.categories.map(c=>({key:"custom:"+c.id,label:c.name,color:c.color,icon:c.icon}))
 ],[data.categories]);
 const nameFor=(k:string)=>allCats.find(c=>c.key===k)?.label||"Pessoal";
 const colorFor=(k:string)=>allCats.find(c=>c.key===k)?.color||"#9585a8";
 const dayEvents=useMemo(()=>data.events.filter(e=>occurs(e,selectedDate)&&(filter==="all"||catKey(e)===filter)).sort((a,b)=>a.start_time.localeCompare(b.start_time)),[data.events,selectedDate,filter]);
 const pending=useMemo(()=>data.tasks.filter(t=>t.status!=="done"&&(filter==="all"||catKey(t)===filter)).sort((a,b)=>a.due_date.localeCompare(b.due_date)),[data.tasks,filter]);
 const weekDates=useMemo(()=>Array.from({length:7},(_,i)=>addDays(week,i)),[week]);
 const weekTotals=useMemo(()=>categoryCounts(data.events,week,7),[data.events,week]);
 const upcoming=useMemo(()=>data.events.filter(e=>(e.category==="birthday")&&Array.from({length:7},(_,n)=>occurs(e,addDays(today(),n))).some(Boolean)),[data.events]);
 const weekTasks=useMemo(()=>data.tasks.filter(t=>t.status!=="done"&&t.due_date>=week&&t.due_date<=addDays(week,6)),[data.tasks,week]);
 const doneTasks=data.tasks.filter(t=>t.status==="done").length;
 function startEvent(e?:EventRow){
  setMode("event");setEditingEvent(e?.id||null);setAlternatives([]);
  setForm(e?{title:e.title,day:e.day,startTime:e.start_time,endTime:e.end_time,category:catKey(e),repeatWeekly:!!e.repeat_weekly,repeatYearly:!!e.repeat_yearly,allDay:!!e.all_day}:{...eventDefaults(),day:selectedDate});setError("");
 }
 function startTask(){setMode("task");setTask({...taskDefaults(),dueDate:selectedDate});setError("")}
 function startCategory(c?:CustomCategoryRow){setMode("category");setEditingCategory(c?.id||null);setCategoryForm(c?{name:c.name,color:c.color,icon:c.icon}:{name:"",color:"#8d7ab0",icon:"tag"});setError("")}
 const close=()=>{setMode(null);setEditingEvent(null);setEditingCategory(null);setAlternatives([])};
 async function saveEvent(ev:React.FormEvent){
  ev.preventDefault();setBusy(true);setError("");setSuccess("");
  try{
   const values={...form,...encodeCat(form.category)};
   const preview:{conflicts:Array<{title:string;day:string;start_time:string;end_time:string}>}=await api("inspectEvent",{...values,id:editingEvent||undefined});
   if(preview.conflicts?.length){
    const detail=preview.conflicts.slice(0,4).map(c=>c.title+" — "+dailyDate(c.day)+" ("+c.start_time+"–"+c.end_time+")").join("\n");
    if(!window.confirm("Possível conflito de horários:\n"+detail+"\n\nDeseja salvar mesmo assim?"))return;
   }
   await api(editingEvent?"editEvent":"createEvent",{...values,id:editingEvent||undefined});
   close();await read();setSuccess("Compromisso salvo com sucesso.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 async function saveTask(ev:React.FormEvent){
  ev.preventDefault();setBusy(true);setError("");
  try{await api("createTask",{...task,...encodeCat(task.category)});close();await read();setSuccess("Tarefa cadastrada com categoria e prioridade.")}
  catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 async function saveCategory(ev:React.FormEvent){
  ev.preventDefault();setBusy(true);setError("");
  try{await api(editingCategory?"editCategory":"createCategory",{...categoryForm,id:editingCategory||undefined});close();await read();setSuccess("Categoria personalizada salva.")}
  catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 async function toggleTask(t:TaskRow){
  if(!window.confirm(t.status==="done"?"Marcar esta tarefa como pendente?":"Marcar como concluída?"))return;
  setBusy(true);try{await api("toggleTask",{id:t.id});await read()}catch(e){setError(String(e))}finally{setBusy(false)}
 }
 function suggestMoving(e:EventRow){
  if(e.repeat_weekly||e.repeat_yearly){startEvent(e);setError("Este compromisso é recorrente. Editar a data ou o horário modificará a série. Confira antes de salvar.");return}
  startEvent(e);
  setAlternatives(alternativeTimes(e,data.events,today(),3));
 }
 async function suggestTask(t:TaskRow){
  setBusy(true);setPlanTask(t.id);setPlanned([]);setError("");
  try{
   const r=await fetch("/api/suggest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:t.id,today:today(),time:new Date().toTimeString().slice(0,5)})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Sem horários encontrados");
   setPlanned(j.slots||[]);
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 async function book(t:TaskRow,s:{day:string;start_time:string;end_time:string}){
  if(!window.confirm("Reservar "+dailyDate(s.day)+" das "+s.start_time+" às "+s.end_time+" para "+t.title+"?"))return;
  setBusy(true);try{
   await api("scheduleTask",{taskId:t.id,day:s.day,startTime:s.start_time,endTime:s.end_time});
   await read();setSuccess("Horário reservado na agenda.");await suggestTask(t)
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 function saveReminders(){
  if(!userId){setError("Faça login para configurar os avisos.");return}
  if(prefs.enabled && "Notification" in window && Notification.permission!=="granted"){
   Notification.requestPermission().then(p=>{
    if(p!=="granted"){setError("Seu navegador não autorizou notificações. A configuração não foi ativada.");return}
    localStorage.setItem("nexo:life-reminders:"+userId,JSON.stringify(prefs));setSuccess("Avisos ativados neste navegador, enquanto o NEXO estiver aberto.");
   });return;
  }
  if(prefs.enabled && !("Notification" in window)){setError("Este navegador não oferece notificações.");return}
  localStorage.setItem("nexo:life-reminders:"+userId,JSON.stringify(prefs));
  setSuccess(prefs.enabled?"Avisos configurados para este navegador.":"Avisos desativados.");
 }

 return <main className={st.shell}><div className={st.wrap}>
  <a href="/" className={st.back}><ArrowLeft size={16}/> Voltar ao NEXO</a>
  <header className={st.heading}><div><span className={st.tag}>NEXO · TODAS AS ÁREAS DA VIDA</span><h1>Minha vida em sintonia.</h1><p className={st.muted}>Trabalho, treinos, estudo, família, encontros e lazer. Tudo em uma agenda, com prioridades escolhidas por você.</p></div><div className={st.actions}><button className={st.btn} onClick={()=>startEvent()}><Plus size={16}/> Compromisso</button><button className={st.btn+" "+st.secondary} onClick={startTask}><Plus size={16}/> Tarefa</button></div></header>
  {error&&<div className={st.alert} role="alert">{error}</div>}{success&&<div className={st.alert+" "+st.success} role="status">{success}</div>}
  {unauthorized?<section className={st.card}><h2>Entre na sua conta</h2><p>Esta página utiliza os compromissos da sua conta NEXO.</p><a href="/" className={st.btn}>Entrar no NEXO</a></section>:loading?<div className={st.loader}>Organizando sua agenda...</div>:<>
  <div className={st.summary}>
   <article><strong>{Object.values(weekTotals).reduce((a,b)=>a+b,0)}</strong><span>Compromissos nesta semana</span></article>
   <article><strong>{weekTasks.length}</strong><span>Tarefas com prazo nesta semana</span></article>
   <article><strong>{upcoming.length}</strong><span>Aniversários nos próximos 7 dias</span></article>
   <article><strong>{doneTasks}</strong><span>Tarefas concluídas no total</span></article>
  </div>
  {mode&&<section className={st.card}><div className={st.formHeading}><h2>{mode==="category"?(editingCategory?"Editar categoria":"Nova categoria"):mode==="event"?(editingEvent?"Alterar compromisso":"Novo compromisso"):"Nova tarefa"}</h2><button className={st.btn+" "+st.ghost} onClick={close}><X size={15}/> Fechar</button></div>
   {mode==="event"&&<form onSubmit={saveEvent}>
    <label className={st.field}>Nome do compromisso<input required maxLength={180} value={form.title} onChange={e=>setForm(s=>({...s,title:e.target.value}))} placeholder="Ex.: Jantar com amigas"/></label>
    <div className={st.row2}><label className={st.field}>Data<input type="date" required value={form.day} onChange={e=>setForm(s=>({...s,day:e.target.value}))}/></label><label className={st.field}>Categoria<select value={form.category} onChange={e=>setForm(s=>({...s,category:e.target.value}))}>{allCats.map(c=><option value={c.key} key={c.key}>{c.label}</option>)}</select></label></div>
    {!form.allDay&&<div className={st.row2}><label className={st.field}>Início<input type="time" required value={form.startTime} onChange={e=>setForm(s=>({...s,startTime:e.target.value}))}/></label><label className={st.field}>Fim<input type="time" required value={form.endTime} onChange={e=>setForm(s=>({...s,endTime:e.target.value}))}/></label></div>}
    <div className={st.pillrow}><label className={st.check}><input type="checkbox" checked={form.allDay} onChange={e=>setForm(s=>({...s,allDay:e.target.checked}))}/> Dia inteiro</label><label className={st.check}><input type="checkbox" checked={form.repeatWeekly} onChange={e=>setForm(s=>({...s,repeatWeekly:e.target.checked,repeatYearly:false}))}/> Toda semana</label><label className={st.check}><input type="checkbox" checked={form.repeatYearly} onChange={e=>setForm(s=>({...s,repeatYearly:e.target.checked,repeatWeekly:false}))}/> Todo ano</label></div>
    {alternatives.length>0&&<div className={st.notice}><h3>Horários alternativos disponíveis</h3><p className={st.helper}>Selecione um horário para preencher a proposta. Só haverá alteração depois que você salvar.</p><div className={st.slotList}>{alternatives.map((s,i)=><button type="button" key={i} className={st.btn+" "+st.ghost} onClick={()=>setForm(f=>({...f,day:s.day,startTime:s.start_time,endTime:s.end_time}))}>{dailyDate(s.day)} · {s.start_time}–{s.end_time}</button>)}</div></div>}
    <div className={st.actions}><button className={st.btn} disabled={busy}><Save size={16}/> {busy?"Verificando...":"Verificar conflitos e salvar"}</button><button type="button" className={st.btn+" "+st.ghost} onClick={close}>Cancelar</button></div>
   </form>}
   {mode==="task"&&<form onSubmit={saveTask}><label className={st.field}>O que precisa ser feito?<input required maxLength={180} value={task.title} onChange={e=>setTask(s=>({...s,title:e.target.value}))} placeholder="Ex.: Resolver pendência do trabalho"/></label>
    <div className={st.row2}><label className={st.field}>Prazo<input type="date" required value={task.dueDate} onChange={e=>setTask(s=>({...s,dueDate:e.target.value}))}/></label><label className={st.field}>Categoria<select value={task.category} onChange={e=>setTask(s=>({...s,category:e.target.value}))}>{allCats.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label></div>
    <div className={st.row2}><label className={st.field}>Duração (min.)<input type="number" required min={15} max={600} value={task.durationMinutes} onChange={e=>setTask(s=>({...s,durationMinutes:Number(e.target.value)}))}/></label><label className={st.field}>Prioridade<select value={task.priority} onChange={e=>setTask(s=>({...s,priority:e.target.value as TaskForm["priority"]}))}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label></div>
    <label className={st.field}>Observações<textarea value={task.notes} maxLength={1000} rows={2} onChange={e=>setTask(s=>({...s,notes:e.target.value}))}/></label>
    <button className={st.btn} disabled={busy}><Save size={16}/> Salvar tarefa</button>
   </form>}
   {mode==="category"&&<form onSubmit={saveCategory}><div className={st.row2}><label className={st.field}>Nome da categoria<input required minLength={2} maxLength={60} value={categoryForm.name} onChange={e=>setCategoryForm(s=>({...s,name:e.target.value}))} placeholder="Ex.: Viagens"/></label><label className={st.field}>Cor<input type="color" value={categoryForm.color} onChange={e=>setCategoryForm(s=>({...s,color:e.target.value}))}/></label></div><label className={st.field}>Ícone<select value={categoryForm.icon} onChange={e=>setCategoryForm(s=>({...s,icon:e.target.value}))}>{iconChoices.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><p className={st.helper}>Categorias personalizadas podem ser editadas sem apagar compromissos existentes.</p><button className={st.btn} disabled={busy}><Save size={16}/> Salvar categoria</button></form>}
  </section>}
  <div className={st.grid}><div>
   <section className={st.card}><div className={st.toolbar}><div><span className={st.tag}>AGENDA INTEGRADA</span><h2>Seus compromissos</h2></div><div className={st.dateNav}><button title="Semana anterior" onClick={()=>{const w=addDays(week,-7);setWeek(w);setSelectedDate(w)}}><ArrowLeft size={15}/></button><b>{dailyDate(week)} – {dailyDate(addDays(week,6))}</b><button title="Próxima semana" onClick={()=>{const w=addDays(week,7);setWeek(w);setSelectedDate(w)}}><ArrowRight size={15}/></button></div></div>
    <div className={st.daygrid}>{weekDates.map((d,i)=><button key={d} className={st.day+" "+(selectedDate===d?st.selected:"")} aria-pressed={selectedDate===d} aria-label={dailyDate(d)+", "+data.events.filter(e=>occurs(e,d)&&(filter==="all"||catKey(e)===filter)).length+" compromissos"} onClick={()=>setSelectedDate(d)}><small>{weekLabels[i]}</small><strong>{Number(d.slice(-2))}</strong><em>{data.events.filter(e=>occurs(e,d)&&(filter==="all"||catKey(e)===filter)).length} eventos</em></button>)}</div>
    <div className={st.tag} style={{marginBottom:10}}>FILTRAR CATEGORIA</div><div className={st.filters}><button className={st.filter+" "+(filter==="all"?st.active:"")} aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>Todas</button>{allCats.map(c=><button key={c.key} className={st.filter+" "+(filter===c.key?st.active:"")} aria-pressed={filter===c.key} onClick={()=>setFilter(c.key)}><span className={st.dot} style={{background:c.color}}/><CategoryIcon icon={c.icon}/>{c.label}</button>)}</div>
    <div className={st.timeline}><h3>{dailyDate(selectedDate)} · {dayEvents.length} compromisso(s)</h3>{dayEvents.length?dayEvents.map(e=><article key={e.id} className={st.entry}><span className={st.time}>{e.all_day?"Dia todo":e.start_time}</span><div className={st.info}><strong>{e.title}</strong><small><span className={st.dot} style={{background:colorFor(catKey(e)),marginRight:5}}/>{nameFor(catKey(e))}{e.repeat_weekly?" · toda semana":e.repeat_yearly?" · todo ano":""}{!e.all_day?" · "+e.start_time+"–"+e.end_time:""}</small></div><button className={st.btn+" "+st.secondary} onClick={()=>suggestMoving(e)}><Edit3 size={13}/> Reorganizar</button></article>):<p className={st.empty}>Não há compromissos nesta data e categoria. Você pode adicionar um novo evento acima.</p>}</div>
   </section>
   <section className={st.card}><div className={st.toolbar}><div><span className={st.tag}>PASSOS CONCRETOS</span><h2>Suas tarefas</h2></div><button onClick={startTask} className={st.btn+" "+st.secondary}><Plus size={15}/> Nova tarefa</button></div>
    {pending.length?pending.slice(0,18).map(t=><article key={t.id} className={st.entry}><button className={st.btn+" "+st.ghost} onClick={()=>toggleTask(t)} aria-label={"Concluir "+t.title}><CheckCircle2 size={15}/></button><div className={st.info}><strong>{t.title}</strong><small><span className={st.dot} style={{background:colorFor(catKey(t)),marginRight:5}}/>{nameFor(catKey(t))} · {dailyDate(t.due_date)} · {t.duration_minutes} min · prioridade {t.priority==="high"?"alta":t.priority==="medium"?"média":"baixa"}</small></div><button className={st.btn+" "+st.secondary} disabled={busy} onClick={()=>suggestTask(t)}><Clock size={14}/> Planejar</button></article>):<p className={st.empty}>Nenhuma tarefa pendente nesta categoria.</p>}
    {planTask&&<div className={st.notice}><h3>Sugestões de horário</h3><p className={st.helper}>Esses blocos respeitam seus compromissos de todas as categorias. Nenhum horário será reservado sem confirmação.</p>{planned.length?planned.map((s,i)=><div key={i} className={st.slot}><span>{dailyDate(s.day)} · {s.start_time}–{s.end_time}</span><button className={st.btn} onClick={()=>{const t=data.tasks.find(t=>t.id===planTask);if(t)book(t,s)}}>Reservar</button></div>):<p className={st.helper}>Não foram encontrados blocos livres para esta tarefa dentro do prazo.</p>}</div>}
   </section>
  </div><aside>
   <section className={st.card}><span className={st.tag}>VISÃO SEMANAL</span><h2>Como está sua semana?</h2><div className={st.weekList}>{allCats.filter(c=>(weekTotals[c.key]||0)>0).map(c=><div className={st.weekLine} key={c.key}><strong><i className={st.dot} style={{background:c.color,marginRight:7}}/>{c.label}</strong><span>{weekTotals[c.key]} compromisso(s)</span></div>)}{!Object.keys(weekTotals).length&&<p className={st.muted}>Nenhum compromisso cadastrado.</p>}</div>
    <hr className={st.hr}/><h3>Prazos e datas importantes</h3>{weekTasks.slice(0,4).map(t=><div key={t.id} className={st.entry}><div className={st.info}><strong>{t.title}</strong><small>Até {dailyDate(t.due_date)}</small></div></div>)}{upcoming.slice(0,3).map(e=><div key={e.id} className={st.entry}><div className={st.info}><strong>{e.title}</strong><small>Aniversário nos próximos sete dias</small></div></div>)}{!weekTasks.length&&!upcoming.length&&<p className={st.helper}>Sem prazos pendentes ou aniversários próximos.</p>}
    <a className={st.btn+" "+st.secondary} href="/resumo" style={{marginTop:14}}>Abrir meu resumo diário</a>
   </section>
   <section className={st.card}><span className={st.tag}>AO SEU JEITO</span><h2>Minhas categorias</h2><p className={st.muted}>Crie categorias próprias para viagens, projetos, voluntariado ou qualquer outra área da sua vida.</p><div className={st.categoryRow}><strong>Categorias padrão</strong><span>{DEFAULT_CATEGORIES.length}</span></div>{data.categories.map(c=><div className={st.categoryRow} key={c.id}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><i className={st.dot} style={{background:c.color}}/><CategoryIcon icon={c.icon}/>{c.name}</span><button onClick={()=>startCategory(c)} className={st.textButton}>Editar</button></div>)}<button className={st.btn+" "+st.secondary} onClick={()=>startCategory()}><Plus size={14}/> Criar categoria</button>
   </section>
   <section className={st.card}><span className={st.tag}>AVISOS COM CONTROLE</span><h2>Lembretes por categoria</h2><p className={st.muted}>Escolha quais áreas merecem avisos e com quanto tempo de antecedência. Os avisos aparecem quando o NEXO estiver aberto e o navegador permitir notificações.</p>
    <label className={st.setting}>Ativar notificações neste navegador<input type="checkbox" checked={prefs.enabled} onChange={e=>setPrefs(s=>({...s,enabled:e.target.checked}))}/></label>
    <label className={st.field}>Antecedência<select value={prefs.lead} onChange={e=>setPrefs(s=>({...s,lead:Number(e.target.value)}))}><option value={15}>15 minutos</option><option value={30}>30 minutos</option><option value={60}>60 minutos</option></select></label>
    {allCats.map(c=><label className={st.setting} key={c.key}><span><i className={st.dot} style={{background:c.color,marginRight:7}}/>{c.label}</span><input type="checkbox" checked={prefs.categories.includes(c.key)} onChange={e=>setPrefs(s=>({...s,categories:e.target.checked?[...s.categories,c.key]:s.categories.filter(k=>k!==c.key)}))}/></label>)}
    <button className={st.btn} disabled={!prefsReady||!userId} onClick={saveReminders}><Bell size={15}/> Salvar preferências</button><p className={st.helper}>Sem rastreamento de localização e sem envio de notificações quando o navegador estiver fechado. Preferências de aviso são locais deste aparelho.</p>
   </section>
   <section className={st.card}><span className={st.tag}>FACILITE SEU DIA</span><h2>Assistente NEXO</h2><p className={st.muted}>Ditado por voz, importação de horários em PDF, Excel e CSV, e conferência antes de salvar.</p><div className={st.actions}><a className={st.btn} href="/assistente"><Sparkles size={15}/> Abrir assistente</a><button className={st.btn+" "+st.ghost} onClick={read}><RefreshCw size={15}/> Atualizar agenda</button></div></section>
  </aside></div></>}
 </div></main>;
}
