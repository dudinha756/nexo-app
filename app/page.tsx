"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { addDays, monday, occurs, minutes, clock, type EventRow, type TaskRow, type SubjectRow } from "@/lib/schedule";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Clock3, Compass, GraduationCap, Heart, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, RefreshCw, Sparkles, Star, Trash2, WandSparkles, X } from "lucide-react";

type Tab = "inicio" | "semana" | "faculdade" | "planejar";
type Modal = "event" | "task" | "subject" | null;
type Payload = { subjects: SubjectRow[]; tasks: TaskRow[]; events: EventRow[] };
type Slot = { day: string; start_time: string; end_time: string };
const empty: Payload = { subjects: [], tasks: [], events: [] };
const ptDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const longDayFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });
const niceMonth = (s: string) => monthFmt.format(new Date(s + "T12:00:00Z"));
const niceDate = (s: string) => longDayFmt.format(new Date(s + "T12:00:00Z"));
const dayOf = (s: string) => new Date(s + "T12:00:00Z").getUTCDay();
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const hourNow = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
const categoryNames: Record<string,string> = { work:"Trabalho", class:"Aula", training:"Treino", personal:"Pessoal", study:"Estudo" };
const categoryColors: Record<string,string> = { work:"coral", class:"purple", training:"sage", personal:"sand", study:"lilac" };
const taskPriority: Record<string,string> = { low:"Tranquila", medium:"Moderada", high:"Importante" };
const dailyNotes = [
  { line:"Você não precisa fazer tudo.", emphasis:"Só precisa começar.", foot:"Pequenos passos também te levam longe." },
  { line:"Organize o que importa.", emphasis:"Viva o que faz sentido.", foot:"Seu tempo merece espaço para respirar." },
  { line:"Um dia de cada vez.", emphasis:"Você está avançando.", foot:"Progresso também acontece devagar." },
  { line:"Sua semana tem espaço", emphasis:"para novos começos.", foot:"A melhor rotina é a que cabe na sua vida." },
  { line:"Menos pressa.", emphasis:"Mais presença.", foot:"Comece pelo próximo passo possível." },
];

async function post(action: string, values: Record<string,unknown> = {}) {
  const r = await fetch("/api/data", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action,...values}) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error || "Não foi possível salvar."); return j;
}

function NexoMark({ small=false }: {small?:boolean}) {
  return <span className={`nexo-mark ${small ? "small" : ""}`} aria-hidden="true"><span>✳</span></span>;
}

function AuthScreen({ onSuccess }: {onSuccess:()=>void}) {
  const [mode,setMode] = useState<"login"|"register"|"forgot">("login");
  const [name,setName] = useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [message,setMessage]=useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (mode==="forgot") {
        const result=await authClient.requestPasswordReset({email,redirectTo:window.location.origin+"/reset-password"});
        if(result.error) throw new Error(result.error.message||"Não foi possível solicitar a recuperação.");
        setMessage("Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.");
      } else if (mode==="register") {
        const result=await authClient.signUp.email({name:name.trim(),email,password});
        if(result.error) throw new Error(result.error.message||"Não foi possível criar a conta.");
        setMessage("Conta criada! Se a confirmação por e-mail estiver ativada, verifique sua caixa de entrada.");
        onSuccess();
      } else {
        const result=await authClient.signIn.email({email,password});
        if(result.error) throw new Error(result.error.message||"E-mail ou senha incorretos.");
        onSuccess();
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Algo deu errado. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="auth-shell">
    <section className="auth-intro"><div className="brand light"><NexoMark/><span>nexo<span className="brand-period">.</span></span></div>
      <span className="auth-spark one">✧</span><span className="auth-spark two">✦</span><span className="auth-spark three">✧</span>
      <div className="auth-quote"><p>Um espaço para tudo<br/>o que faz sua vida <em>acontecer.</em></p><span>Seu tempo, suas ideias, sua rotina. Em sintonia.</span></div>
      <div className="auth-quote-card">✳ &nbsp; pequenas conquistas, grandes caminhos.</div>
    </section>
    <section className="auth-panel"><div className="auth-panel-inner"><div className="auth-mobile-brand"><NexoMark small/> nexo.</div><div className="eyebrow">BEM-VINDA AO SEU ESPAÇO <span>✳</span></div>
      <h1>{mode==="register"?"Comece sua jornada.":mode==="forgot"?"Recuperar acesso.":"Que bom ter você aqui."}</h1>
      <p className="muted">{mode==="register"?"Organize suas semanas de um jeito mais leve.":mode==="forgot"?"Vamos enviar um link para seu e-mail.":"Seu próximo passo começa com um pouco de organização."}</p>
      <form onSubmit={submit} className="auth-form">
        {mode==="register"&&<label>Seu nome<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?" autoComplete="name"/></label>}
        <label>E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email"/></label>
        {mode!=="forgot"&&<label>Senha<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" autoComplete={mode==="register"?"new-password":"current-password"}/></label>}
        {error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="form-success" role="status">{message}</p>}
        <button type="submit" className="primary-button auth-submit" disabled={busy}>{busy?"Um momento...":mode==="login"?"Entrar na minha conta":mode==="register"?"Criar minha conta":"Enviar link de recuperação"} <ArrowUpRight size={18}/></button>
      </form>
      <div className="auth-links">{mode==="login"?<><button onClick={()=>{setMode("forgot");setError("");setMessage("");}}>Esqueceu sua senha?</button><span>Ainda não tem conta? <button onClick={()=>{setMode("register");setError("");setMessage("");}}>Cadastre-se</button></span></>:<button onClick={()=>{setMode("login");setError("");setMessage("");}}>← Voltar para entrar</button>}</div>
      <p className="auth-footnote">Um espaço exclusivo e privado para a sua rotina.</p>
    </div></section>
  </div>;
}

export default function Home() {
  const [user,setUser]=useState<{id:string; name:string; email:string}|null>(null);
  const [authReady,setAuthReady]=useState(false); const [authVersion,setAuthVersion]=useState(0);
  const [tab,setTab]=useState<Tab>("inicio"); const [modal,setModal]=useState<Modal>(null);
  const [data,setData]=useState<Payload>(empty); const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);const [alert,setAlert]=useState("");
  const [today] = useState(localToday); const [selectedDay,setSelectedDay] = useState(localToday); const [week,setWeek]=useState(()=>monday(localToday()));
  const [filter,setFilter]=useState("all");const [plannerTask,setPlannerTask]=useState("");
  const [slots,setSlots]=useState<Slot[]>([]);const [remaining,setRemaining]=useState<number|null>(null);
  const [planning,setPlanning]=useState(false);const [mobileMenu,setMobileMenu]=useState(false);
  const [noteIndex,setNoteIndex]=useState(()=>new Date().getDate()%dailyNotes.length);
  const [fTitle,setFTitle]=useState(""); const [fDay,setFDay]=useState(localToday);const [fStart,setFStart]=useState("09:00");const [fEnd,setFEnd]=useState("10:00");const [fCategory,setFCategory]=useState("personal");const [fRepeat,setFRepeat]=useState(false);
  const [fSubject,setFSubject]=useState("");const [fNotes,setFNotes]=useState("");const [fDuration,setFDuration]=useState(60);const [fPriority,setFPriority]=useState("medium");
  const [fColor,setFColor]=useState("#9188ca");

  useEffect(()=>{let active=true;authClient.getSession().then(({data:d})=>{if(active){const u=d?.user;setUser(u?{id:u.id,name:u.name,email:u.email}:null);setAuthReady(true);}}).catch(()=>{if(active)setAuthReady(true);});return()=>{active=false};},[authVersion]);
  const load=useCallback(async()=>{setLoading(true);try{const r=await fetch("/api/data",{cache:"no-store"});if(r.status===401){setUser(null);return;}const j=await r.json();if(!r.ok)throw new Error(j.error||"Erro ao carregar.");setData(j);}catch(e){setAlert(e instanceof Error?e.message:"Não foi possível carregar os dados.");}finally{setLoading(false);}},[]);
  useEffect(()=>{if(user)load();},[user,load]);
  const weekDays=useMemo(()=>Array.from({length:7},(_,i)=>addDays(week,i)),[week]);
  const activeTasks=useMemo(()=>data.tasks.filter(t=>t.status!=="done"),[data.tasks]);
  const dueTasks=useMemo(()=>[...activeTasks].sort((a,b)=>a.due_date.localeCompare(b.due_date)||(a.priority==="high"?-1:1)),[activeTasks]);
  const completed=data.tasks.length-activeTasks.length;
  const todaysEvents=useMemo(()=>data.events.filter(e=>occurs(e,selectedDay)).sort((a,b)=>a.start_time.localeCompare(b.start_time)),[data.events,selectedDay]);
  const fullWeekEvents=useMemo(()=>weekDays.flatMap(d=>data.events.filter(e=>occurs(e,d)).map(e=>({...e,occurrence:d}))).sort((a,b)=>a.occurrence.localeCompare(b.occurrence)||a.start_time.localeCompare(b.start_time)),[data.events,weekDays]);
  const nextTasks=dueTasks.slice(0,4);
  const greeting=()=>{const h=new Date().getHours();return h<12?"Bom dia":h<18?"Boa tarde":"Boa noite"};
  const firstName=user?.name?.trim().split(/\s+/)[0]||"você";
  const subjectFor=(id:string|null)=>data.subjects.find(s=>s.id===id);
  const eventFor=(e:EventRow)=>data.tasks.find(t=>t.id===e.task_id);
  const clearForm=()=>{setFTitle("");setFDay(selectedDay);setFStart("09:00");setFEnd("10:00");setFCategory("personal");setFRepeat(false);setFSubject("");setFNotes("");setFDuration(60);setFPriority("medium");setFColor("#9188ca");};
  const openModal=(type:Modal)=>{clearForm();setModal(type);setAlert("");};
  const run=async(action:string,payload:Record<string,unknown>,end?:()=>void)=>{setBusy(true);setAlert("");try{await post(action,payload);await load();end?.();return true;}catch(e){setAlert(e instanceof Error?e.message:"Não foi possível concluir.");return false;}finally{setBusy(false);}};
  async function submitModal(e:FormEvent){e.preventDefault();if(modal==="subject")await run("createSubject",{name:fTitle,color:fColor},()=>setModal(null));if(modal==="event")await run("createEvent",{title:fTitle,day:fDay,startTime:fStart,endTime:fEnd,category:fCategory,repeatWeekly:fRepeat},()=>setModal(null));if(modal==="task")await run("createTask",{title:fTitle,notes:fNotes,dueDate:fDay,durationMinutes:fDuration,priority:fPriority,subjectId:fSubject||null},()=>setModal(null));}
  const removeItem=async(action:string,id:string)=>{if(!window.confirm("Deseja excluir este item?"))return;await run(action,{id});};
  const generateSuggestions=async(id:string)=>{setPlannerTask(id);setSlots([]);setRemaining(null);setPlanning(true);setAlert("");try{const r=await fetch("/api/suggest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:id,today:localToday(),time:hourNow()})});const j=await r.json();if(!r.ok)throw Error(j.error||"Não foi possível planejar.");setSlots(j.slots);setRemaining(j.remainingMinutes);}catch(e){setAlert(e instanceof Error?e.message:"Erro ao planejar.");}finally{setPlanning(false);}};
  const bookSlot=async(slot:Slot)=>{const ok=await run("scheduleTask",{taskId:plannerTask,day:slot.day,startTime:slot.start_time,endTime:slot.end_time});if(ok)await generateSuggestions(plannerTask);};
  async function logout(){await authClient.signOut();setUser(null);setData(empty);setAuthVersion(v=>v+1);}
  if(!authReady)return <div className="splash"><NexoMark/><span>nexo.</span><p>Preparando seu espaço...</p></div>;
  if(!user)return <AuthScreen onSuccess={()=>setAuthVersion(v=>v+1)}/>;

  const nav: {id:Tab;label:string;icon:typeof LayoutDashboard}[]=[{id:"inicio",label:"Visão geral",icon:LayoutDashboard},{id:"semana",label:"Minha semana",icon:CalendarDays},{id:"faculdade",label:"Faculdade",icon:GraduationCap},{id:"planejar",label:"Planejar",icon:WandSparkles}];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?"open":""}`}><div className="brand"><NexoMark/><span>nexo<span className="brand-period">.</span></span></div><p className="side-label">SEU ESPAÇO</p>
      <nav className="side-nav" aria-label="Navegação principal">{nav.map(n=><button key={n.id} className={tab===n.id?"active":""} onClick={()=>{setTab(n.id);setMobileMenu(false);}}><n.icon size={19} strokeWidth={1.8}/>{n.label}{tab===n.id&&<span className="active-dot"/>}</button>)}</nav>
      <div className="side-spark-card"><span>✧ ✦ ✧</span><p>Organizar também é uma forma de cuidar de você.</p><small>UM DIA DE CADA VEZ</small></div>
      <div className="side-bottom"><button onClick={logout}><LogOut size={17}/> Sair da conta</button><div className="side-user"><span className="avatar">{firstName[0]?.toUpperCase()}</span><div><strong>{user.name}</strong><small>Meu espaço pessoal</small></div></div></div>
    </aside>
    {mobileMenu&&<button className="mobile-overlay" aria-label="Fechar menu" onClick={()=>setMobileMenu(false)}/>}
    <main className="main-content">
      <header className="topbar"><div className="mobile-brand"><button aria-label="Abrir menu" className="icon-button" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button><span>nexo.</span></div><div className="breadcrumb"><span>MEU ESPAÇO</span><span className="slash">/</span><strong>{nav.find(n=>n.id===tab)?.label}</strong></div><div className="topbar-actions"><span className="today-pill"><CalendarDays size={15}/>{niceDate(today)}</span><span className="avatar">{firstName[0]?.toUpperCase()}</span></div></header>
      <div className="page-wrap">
        {alert&&<div className="notice" role="alert"><span>{alert}</span><button aria-label="Fechar aviso" onClick={()=>setAlert("")}><X size={16}/></button></div>}
        {tab==="inicio"&&<>
          <div className="intro-row"><div><div className="eyebrow">SEU DIA, DO SEU JEITO <span>✳</span></div><h1>{greeting()}, <em>{firstName}.</em></h1><p>Que tal fazer hoje valer a pena, sem precisar fazer tudo de uma vez?</p></div><button className="soft-button" onClick={()=>setTab("semana")}><CalendarDays size={17}/> Ver minha semana <ArrowUpRight size={16}/></button></div>
          <section className="hero-card"><span className="hero-art a">✳</span><span className="hero-art b">✧</span><span className="hero-art c">✶</span><span className="hero-art d">✧</span><div className="hero-inner"><span className="hero-eyebrow"><Sparkles size={16}/> UM LEMBRETE PARA HOJE</span><h2>{dailyNotes[noteIndex].line}<br/><em>{dailyNotes[noteIndex].emphasis}</em></h2><p>{dailyNotes[noteIndex].foot}</p></div><button type="button" className="hero-next" aria-label="Ver outro lembrete" onClick={()=>setNoteIndex(i=>(i+1)%dailyNotes.length)}><ArrowRight size={18}/></button><div className="hero-corner">✧ NEXO NOTES · {noteIndex+1}/{dailyNotes.length}</div></section>
          <div className="stats-grid"><div className="stat-card"><div className="stat-icon violet"><BookOpen size={21}/></div><div><span>Para fazer</span><strong>{activeTasks.length.toString().padStart(2,"0")}</strong><small>tarefas em aberto</small></div></div><div className="stat-card"><div className="stat-icon pink"><CheckCircle2 size={21}/></div><div><span>Concluídas</span><strong>{completed.toString().padStart(2,"0")}</strong><small>pequenas conquistas</small></div></div><div className="stat-card"><div className="stat-icon green"><CalendarDays size={21}/></div><div><span>Na semana</span><strong>{fullWeekEvents.length.toString().padStart(2,"0")}</strong><small>compromissos previstos</small></div></div></div>
          <div className="two-columns"><section className="surface-card"><div className="section-title"><div><span className="eyebrow">MANTENHA O FOCO</span><h3>Próximas entregas <span>✦</span></h3></div><button className="text-button" onClick={()=>setTab("faculdade")}>Ver todas <ArrowRight size={15}/></button></div>{nextTasks.length? <div className="mini-tasks">{nextTasks.map(t=><div className="mini-task" key={t.id}><button className="check-button" aria-label={`Concluir ${t.title}`} disabled={busy} onClick={()=>run("toggleTask",{id:t.id})}><Circle size={22}/></button><div><strong>{t.title}</strong><small>{subjectFor(t.subject_id)?.name||"Tarefa pessoal"} · {niceDate(t.due_date)}</small></div><span className={`priority-dot ${t.priority}`}/></div>)}</div>:<EmptyState text="Sua lista está tranquila por aqui."/>}<button className="add-inline" onClick={()=>openModal("task")}><Plus size={17}/> Adicionar tarefa</button></section>
          <section className="surface-card"><div className="section-title"><div><span className="eyebrow">SEU RITMO</span><h3>{selectedDay===today?"Agenda de hoje":"Agenda do dia"} <span>✧</span></h3></div><button className="icon-button" aria-label="Ir para semana" onClick={()=>setTab("semana")}><ArrowUpRight size={19}/></button></div><div className="day-swiper">{Array.from({length:5},(_,i)=>addDays(today,i)).map(d=><button key={d} onClick={()=>setSelectedDay(d)} className={selectedDay===d?"selected":""}><small>{ptDays[dayOf(d)]}</small><strong>{d.slice(-2)}</strong></button>)}</div>{todaysEvents.length? <div className="today-events">{todaysEvents.slice(0,4).map(e=><div className="today-event" key={e.id}><span className={`event-rail ${categoryColors[e.category]||"sand"}`}/><div><strong>{e.title}</strong><small>{e.start_time}–{e.end_time} · {categoryNames[e.category]}</small></div></div>)}</div>:<EmptyState text="Nenhum compromisso para este dia."/>}<button className="add-inline" onClick={()=>openModal("event")}><Plus size={17}/> Novo compromisso</button></section></div>
        </>}
        {tab==="semana"&&<><PageHeading eyebrow="O TEMPO É SEU" title="Minha semana" sub="Um olhar mais leve para tudo que cabe nos seus dias." action={<button className="primary-button" onClick={()=>openModal("event")}><Plus size={18}/> Novo compromisso</button>}/><div className="calendar-surface"><div className="calendar-header"><div><span className="eyebrow">CALENDÁRIO SEMANAL</span><h3>{niceMonth(week)}</h3></div><div className="week-nav"><button aria-label="Semana anterior" onClick={()=>{setWeek(addDays(week,-7));setSelectedDay(addDays(week,-7));}}><ArrowLeft size={18}/></button><button className="today-link" onClick={()=>{setWeek(monday(today));setSelectedDay(today);}}>Hoje</button><button aria-label="Próxima semana" onClick={()=>{setWeek(addDays(week,7));setSelectedDay(addDays(week,7));}}><ArrowRight size={18}/></button></div></div><div className="week-grid">{weekDays.map(d=>{const count=data.events.filter(e=>occurs(e,d)).length;return <button className={`week-day ${d===selectedDay?"selected":""} ${d===today?"is-today":""}`} key={d} onClick={()=>setSelectedDay(d)}><small>{ptDays[dayOf(d)]}</small><strong>{Number(d.slice(-2))}</strong><span className="day-dot-row">{Array.from({length:Math.min(3,count)},(_,i)=><i key={i}/>)}</span></button>})}</div><div className="calendar-content"><div className="calendar-day-heading"><span>{niceDate(selectedDay)}</span><span>{todaysEvents.length} {todaysEvents.length===1?"compromisso":"compromissos"}</span></div>{todaysEvents.length?<div className="event-list">{todaysEvents.map(e=><div key={e.id} className="event-item"><div className="event-time">{e.start_time}<span>{e.end_time}</span></div><span className={`event-rail ${categoryColors[e.category]||"sand"}`}/><div className="event-body"><strong>{e.title}</strong><div><span className={`tag ${categoryColors[e.category]||"sand"}`}>{categoryNames[e.category]}</span>{e.repeat_weekly&&<span className="repeat-label"><RefreshCw size={12}/> Semanal</span>}</div></div><button className="delete-button" title="Excluir compromisso" aria-label={`Excluir ${e.title}`} disabled={busy} onClick={()=>removeItem("deleteEvent",e.id)}><Trash2 size={17}/></button></div>)}</div>:<EmptyState text="Um respiro na sua agenda! Esse dia está livre."/>}<button className="add-inline" onClick={()=>openModal("event")}><Plus size={17}/> Adicionar neste dia</button></div></div><div className="note-strip"><Sparkles size={18}/><p><strong>Dica NEXO:</strong> você pode cadastrar aulas, trabalho e treinos como compromissos semanais recorrentes. Eles serão considerados automaticamente ao planejar seus estudos.</p></div></>}
        {tab==="faculdade"&&<><PageHeading eyebrow="SUA JORNADA ACADÊMICA" title="Faculdade" sub="Um lugar para suas matérias, entregas e pequenas vitórias." action={<button className="primary-button" onClick={()=>openModal("task")}><Plus size={18}/> Nova tarefa</button>}/><div className="subject-section"><div className="section-title"><div><span className="eyebrow">SUAS MATÉRIAS</span><h3>Disciplinas <span>✧</span></h3></div><button className="text-button" onClick={()=>openModal("subject")}><Plus size={17}/> Adicionar</button></div><div className="subject-grid">{data.subjects.map(s=><button key={s.id} className={`subject-chip ${filter===s.id?"on":""}`} onClick={()=>setFilter(filter===s.id?"all":s.id)}><i style={{background:s.color}}/><span>{s.name}</span><small>{data.tasks.filter(t=>t.subject_id===s.id && t.status==="todo").length}</small></button>)}<button className="subject-create" onClick={()=>openModal("subject")}><Plus size={19}/> {data.subjects.length?"Nova disciplina":"Adicionar primeira disciplina"}</button></div></div><div className="task-panel"><div className="section-title"><div><span className="eyebrow">UM PASSO DE CADA VEZ</span><h3>Suas tarefas <span>✦</span></h3></div><select className="filter-select" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filtrar por disciplina"><option value="all">Todas as disciplinas</option>{data.subjects.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></div>{data.tasks.filter(t=>filter==="all"||t.subject_id===filter).length? <div className="task-list">{data.tasks.filter(t=>filter==="all"||t.subject_id===filter).map(t=><div key={t.id} className={`task-row ${t.status==="done"?"done":""}`}><button className="check-button" aria-label={t.status==="done"?`Reabrir ${t.title}`:`Concluir ${t.title}`} disabled={busy} onClick={()=>run("toggleTask",{id:t.id})}>{t.status==="done"?<CheckCircle2 size={24} fill="#9284bf" color="#9284bf" stroke="white"/>:<Circle size={24}/>}</button><div className="task-body"><strong>{t.title}</strong><div className="task-meta"><span>{subjectFor(t.subject_id)?.name||"Sem disciplina"}</span><span><CalendarDays size={13}/> {niceDate(t.due_date)}</span><span><Clock3 size={13}/> {t.duration_minutes} min</span></div>{t.notes&&<p>{t.notes}</p>}</div><span className={`priority-badge ${t.priority}`}>{taskPriority[t.priority]}</span><div className="task-actions">{t.status!=="done"&&<button title="Planejar tarefa" aria-label={`Planejar ${t.title}`} onClick={()=>{setTab("planejar");generateSuggestions(t.id);}}><WandSparkles size={17}/></button>}<button title="Excluir tarefa" aria-label={`Excluir ${t.title}`} disabled={busy} onClick={()=>removeItem("deleteTask",t.id)}><Trash2 size={17}/></button></div></div>)}</div>:<EmptyState text="Ainda não há tarefas nessa lista."/>}<button className="add-inline" onClick={()=>openModal("task")}><Plus size={17}/> Criar uma tarefa</button></div></>}
        {tab==="planejar"&&<><PageHeading eyebrow="TEMPO PARA O QUE IMPORTA" title="Planejar com leveza" sub="O NEXO encontra um espacinho na sua rotina para cada objetivo."/><div className="planner-grid"><section className="planner-selector"><div className="planner-number">01 / ESCOLHA UMA TAREFA</div><h3>O que vamos organizar?</h3><p>Selecione uma tarefa e sugeriremos horários que não conflitam com sua agenda.</p><div className="planner-choices">{activeTasks.length?activeTasks.map(t=><button key={t.id} className={`planner-choice ${plannerTask===t.id?"on":""}`} onClick={()=>generateSuggestions(t.id)}><span className="choice-radio">{plannerTask===t.id&&<Check size={15}/>}</span><span><strong>{t.title}</strong><small>{t.duration_minutes} min · até {niceDate(t.due_date)}</small></span><ArrowUpRight size={16}/></button>):<EmptyState text="Cadastre uma tarefa para começar a planejar."/>}</div><button className="add-inline" onClick={()=>openModal("task")}><Plus size={17}/> Criar nova tarefa</button></section><section className="planner-results"><span className="planner-number">02 / ENCONTRE SEU MOMENTO</span><div className="planner-decoration">✴</div><h3>Seu tempo, no seu ritmo.</h3>{planning?<p className="planner-description">Encontrando seus momentos livres...</p>:!plannerTask?<div className="planner-placeholder"><WandSparkles size={28}/><p>Escolha uma tarefa ao lado para descobrir seus horários disponíveis.</p></div>:<><p className="planner-description">{remaining===0?"Você já reservou o tempo estimado para esta tarefa.":remaining!==null?`Ainda faltam ${remaining} minutos para essa tarefa. Aqui estão algumas sugestões:`:"Sugestões para sua rotina."}</p>{slots.length?<div className="slot-list">{slots.map((s,i)=><div className="slot-row" key={`${s.day}-${s.start_time}`}><div className="slot-date"><strong>{ptDays[dayOf(s.day)]}</strong><small>{niceDate(s.day)}</small></div><div className="slot-time"><Clock3 size={15}/>{s.start_time} – {s.end_time}</div><button disabled={busy} title="Reservar na agenda" onClick={()=>bookSlot(s)}>Reservar <Plus size={15}/></button></div>)}</div>:<div className="planner-placeholder"><Clock3 size={26}/><p>{remaining===0?"Tudo planejado! Seus horários estão na agenda.":"Não encontramos espaços livres antes do prazo. Ajuste a agenda, a duração ou o prazo."}</p></div>}</>}</section></div><div className="note-strip"><Star size={18}/><p><strong>Você tem o controle:</strong> o NEXO apenas sugere. A sessão entra na sua semana quando você clica em “Reservar”. Nenhum compromisso é alterado automaticamente.</p></div></>}
      </div>
    </main>
    <nav className="bottom-nav" aria-label="Navegação móvel">{nav.map(n=><button key={n.id} onClick={()=>setTab(n.id)} className={tab===n.id?"active":""}><n.icon size={21}/><span>{n.id==="inicio"?"Início":n.id==="semana"?"Semana":n.id==="faculdade"?"Faculdade":"Planejar"}</span></button>)}</nav>
    {modal&&<div className="modal-scrim" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><span className="eyebrow">SEU PRÓXIMO PASSO</span><h2 id="modal-title">{modal==="task"?"Nova tarefa":modal==="event"?"Novo compromisso":"Nova disciplina"} <span>✦</span></h2></div><button className="icon-button" aria-label="Fechar" onClick={()=>setModal(null)}><X size={20}/></button></div><form onSubmit={submitModal} className="modal-form"><label>{modal==="subject"?"Nome da disciplina":modal==="event"?"Nome do compromisso":"O que você precisa fazer?"}<input required minLength={2} maxLength={modal==="subject"?100:180} autoFocus value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder={modal==="subject"?"Ex.: Macroeconomia":modal==="event"?"Ex.: Aula, trabalho, treino...":"Ex.: Preparar apresentação"}/></label>{modal==="task"&&<><label>Disciplina<select value={fSubject} onChange={e=>setFSubject(e.target.value)}><option value="">Sem disciplina específica</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Observações (opcional)<textarea maxLength={1000} value={fNotes} onChange={e=>setFNotes(e.target.value)} placeholder="Algum detalhe importante?" rows={2}/></label></>}{modal!=="subject"&&<label>{modal==="event"?"Data do compromisso":"Prazo de entrega"}<input type="date" required value={fDay} onChange={e=>setFDay(e.target.value)}/></label>}{modal==="event"&&<><div className="form-two"><label>Começa às<input type="time" required value={fStart} onChange={e=>setFStart(e.target.value)}/></label><label>Termina às<input type="time" required value={fEnd} onChange={e=>setFEnd(e.target.value)}/></label></div><label>Categoria<select value={fCategory} onChange={e=>setFCategory(e.target.value)}><option value="personal">Pessoal</option><option value="work">Trabalho</option><option value="class">Faculdade / aula</option><option value="training">Treino</option><option value="study">Estudo</option></select></label><label className="switch-line"><input type="checkbox" checked={fRepeat} onChange={e=>setFRepeat(e.target.checked)}/><span>Repetir semanalmente a partir desta data</span></label></>}{modal==="task"&&<><div className="form-two"><label>Tempo estimado<select value={fDuration} onChange={e=>setFDuration(Number(e.target.value))}>{[30,45,60,90,120,180,240,300].map(n=><option key={n} value={n}>{n} minutos</option>)}</select></label><label>Prioridade<select value={fPriority} onChange={e=>setFPriority(e.target.value)}><option value="low">Tranquila</option><option value="medium">Moderada</option><option value="high">Importante</option></select></label></div></>}{modal==="subject"&&<div className="color-picker"><span>Escolha uma cor</span><div>{["#9188ca","#daaaa8","#86aa9c","#d1aa72","#a3b7d7","#bd8daa"].map(c=><button type="button" key={c} aria-label={`Cor ${c}`} aria-pressed={fColor===c} onClick={()=>setFColor(c)} className={fColor===c?"chosen":""} style={{background:c}}>{fColor===c&&<Check size={17} color="white"/>}</button>)}</div></div>}{alert&&<p className="form-error" role="alert">{alert}</p>}<div className="modal-footer"><button type="button" className="soft-button" onClick={()=>setModal(null)}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}>{busy?"Salvando...":"Salvar"} <Check size={17}/></button></div></form></div></div>}
  </div>;
}

function EmptyState({text}:{text:string}) {return <div className="empty-state"><span>✧</span><p>{text}</p></div>}
function PageHeading({eyebrow,title,sub,action}:{eyebrow:string;title:string;sub:string;action?:ReactNode}) {return <div className="page-heading"><div><div className="eyebrow">{eyebrow} <span>✳</span></div><h1>{title}<span className="heading-star">✧</span></h1><p>{sub}</p></div>{action}</div>}
