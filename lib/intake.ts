/** Leitura local e interpretador de rotina em português. Sem envio de áudio/planilhas a terceiros. */
import { addDays, validDay } from './schedule';

export type DraftItem = {
  id: string; kind: 'event' | 'task'; title: string; day: string;
  startTime: string; endTime: string; category: string;
  repeatWeekly: boolean; repeatYearly: boolean; allDay: boolean;
  durationMinutes: number; priority: 'low' | 'medium' | 'high';
  selected: boolean; warning: string; source: string;
};
export type Intake = { items: DraftItem[]; ignored: string[] };
const weekdays = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
const months = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const unaccent = (s:string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const iso = (d:Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function nextWeekday(index:number, base:string) {
  const d = new Date(base+'T12:00:00Z');
  const gap = (index - d.getUTCDay() + 7) % 7;
  return addDays(base,gap);
}
export function parseTime(text:unknown): string | null {
  if (text instanceof Date && !Number.isNaN(text.getTime())) return text.toISOString().slice(11,16);
  if (typeof text === 'number') {
    // Valor horário do Excel, expresso como fração do dia.
    if (text >= 0 && text < 1) { const n=Math.round(text*1440);return `${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
    if (Number.isInteger(text) && text>=0 && text<=23) return `${String(text).padStart(2,'0')}:00`;
  }
  const s=unaccent(String(text??'')).trim();
  const match=s.match(/(?:^|\s)(\d{1,2})(?:\s*(?::|h|horas?)\s*(\d{1,2}))?(?:\s*(?:h|horas?))?(?:\s*(da\s+manha|da\s+tarde|da\s+noite))?(?:\s|$)/);
  if(!match)return null;
  let h=Number(match[1]),m=Number(match[2]||0);const period=match[3]||'';
  if (h>23||m>59) return null;
  if (/tarde|noite/.test(period) && h<12) h+=12;
  if (/manha/.test(period) && h===12)h=0;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function timeRange(s:string): {startTime:string;endTime:string}|null {
  const n=unaccent(s).replace(/\b(das|de|as|ate|a|às|ate as|horas?)\b/g,' ').trim();
  const times=[...n.matchAll(/\b(\d{1,2})(?:\s*(?::|h)\s*(\d{1,2}))?\s*(?:h|horas?)?\b/g)].map(m=>parseTime(m[0]));
  if(times.length<2||!times[0]||!times[1]||times[0]>=times[1])return null;
  return {startTime:times[0],endTime:times[1]};
}
function weekdayIndex(s:string){const t=unaccent(s);return weekdays.findIndex(w=>new RegExp(`\\b${w}(?:-feira)?\\b`,'i').test(t));}
export function parseWeekdays(text:string): number[] {
  const s=unaccent(text).replace(/\bfeiras?\b/g,'');
  const range=s.match(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\s*(?:a|ate|ao|\-|–)\s*(domingo|segunda|terca|quarta|quinta|sexta|sabado)/);
  if(range){const start=weekdays.indexOf(range[1]),end=weekdays.indexOf(range[2]);const days=[start];for(let i=0;i<6 && days[days.length-1]!==end;i++)days.push((days[days.length-1]+1)%7);return days;}
  const found=new Set<number>();for(let i=0;i<weekdays.length;i++){if(new RegExp(`\\b${weekdays[i]}(?:-feira)?\\b`).test(s))found.add(i);}
  if(/todos os dias|diariamente/.test(s))return [0,1,2,3,4,5,6];
  return [...found];
}
function parseNaturalDate(input:string,today:string):string|null{
  const s=unaccent(input),b=new Date(today+'T12:00:00Z');
  if(/\bdepois de amanha\b/.test(s))return addDays(today,2);
  if(/\bamanha\b/.test(s))return addDays(today,1);
  if(/\bhoje\b/.test(s))return today;
  const m=s.match(/\bdia\s+(primeiro|1[º°]?|\d{1,2})(?:\s+de\s+([a-zç]+|\d{1,2}))?(?:\s+de\s+(\d{4}))?/)||s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if(!m){ const weekday=weekdayIndex(s); return weekday>=0 ? nextWeekday(weekday,today) : null; }
  const day=m[1]==='primeiro'?1:parseInt(m[1]);
  let mo=m[2]?months.indexOf(m[2])+1 || parseInt(m[2]):b.getUTCMonth()+1;
  if(!mo||mo>12)return null;
  let year=m[3]?parseInt(m[3]):b.getUTCFullYear();
  const candidate=()=>`${year}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  if(!m[3] && candidate()<today){if(m[2])year++;else{mo++;if(mo>12){mo=1;year++;}}}
  // Com mês omitido, avance até o próximo mês onde o dia exista.
  if (!m[2] && !m[3] && candidate()<today){mo++;if(mo>12){mo=1;year++;}}
  const isoDay=candidate();return validDay(isoDay)?isoDay:null;
}
/** Classify commitments across all parts of life, not only academic activities. */
export function getCategory(text:string){
 const s=unaccent(text);
 if(/aniversario|niver|parabens/.test(s))return 'birthday';
 if(/consulta|medico|dentista|exame|psicolog|terapia|vacina|hospital/.test(s))return 'health';
 if(/jantar|almoco|restaurante|brunch|cafe da manha|pizzaria/.test(s))return 'dining';
 if(/amig[oa]s?|encontro com a turma|happy hour|reuniao de amigos/.test(s))return 'friends';
 if(/familia|mae|pai|irma[oa]|avos?|sobrinh[oa]|filh[oa]/.test(s))return 'family';
 if(/viagem|ferias|cinema|show|passeio|festa|lazer|praia|teatro|festival/.test(s))return 'leisure';
 if(/trabalh|expediente|plantao|reuniao profissional|cliente|fornecedor|escritorio/.test(s))return 'work';
 if(/treino|academia|corrida|jiu|muay|musculacao|pilates|ciclismo|beach tennis|natacao|yoga/.test(s))return 'training';
 if(/faculdade|aula|curso|prova|seminario/.test(s))return 'class';
 if(/estud|revis|leitura|pesquisa|artigo|redacao|exercicio academico/.test(s))return 'study';
 return 'personal';
}
function cleanTitle(s:string) {
 return s.replace(/^(?:me lembra(?:r)?(?: de)?|lembrete(?: de)?|tenho|tem|preciso|anota(?:r)?|adiciona(?:r)?|coloca(?:r)?)(?:\s+que)?\s*/i,'')
  .replace(/\b(?:no|na|dia)\s+(?:primeiro|\d{1,2})(?:\s+de\s+\w+)?(?:\s+de\s+\d{4})?\b/ig,'')
  .replace(/\b(?:as|às)\s+\d{1,2}(?:(?::|h)\d{0,2})?(?:\s+horas?)?(?:\s+da\s+(?:manha|tarde|noite))?\b/ig,'')
  .replace(/\b(?:amanha|hoje|depois de amanha)\b/ig,'').replace(/\s+/g,' ').replace(/^[\s,:-]+|[\s,:-]+$/g,'').trim();
}
function titleCase(s:string){return s.length?s[0].toLocaleUpperCase('pt-BR')+s.slice(1):'Compromisso';}
function item(partial:Partial<DraftItem>):DraftItem {return {id:`nexo-${Math.random().toString(36).slice(2)}`,kind:'event',title:'Compromisso',day:'',startTime:'',endTime:'',category:'personal',repeatWeekly:false,repeatYearly:false,allDay:false,durationMinutes:60,priority:'medium',selected:true,warning:'',source:'',...partial};}
/** Interpreta solicitações de rotina e lembrete. Se ambíguo, marca para revisão humana. */
export function interpretText(text:string,today=iso(new Date())):Intake{
  const items:DraftItem[]=[],ignored:string[]=[];
  for(const raw of text.split(/[\n;]+|\.(?=\s+[A-ZÁÉÍÓÚ])/) .map(x=>x.trim()).filter(Boolean).slice(0,80)) {
    const days=parseWeekdays(raw), range=timeRange(raw), cat=getCategory(raw),norm=unaccent(raw);
    if(days.length&&range&&(/\b(de|das|toda|todo|segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/.test(norm))){
      let name= /trabalh/.test(norm)?'Trabalho':/faculdade|aula/.test(norm)?'Faculdade':/treino/.test(norm)?'Treino':cleanTitle(raw.replace(/\b(?:de|das)?\s*(?:domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\s*(?:a|ate|ao)?\s*(?:domingo|segunda|terca|quarta|quinta|sexta|sabado)?(?:-feira)?/ig,'')) || 'Compromisso';
      for(const dayIndex of days){items.push(item({title:titleCase(name),day:nextWeekday(dayIndex,today),startTime:range.startTime,endTime:range.endTime,category:cat,repeatWeekly:true,source:raw}));}
      continue;
    }
    const day=parseNaturalDate(raw,today);
    if(!day){ignored.push(`Não encontrei uma data em: “${raw.slice(0,120)}”.`);continue;}
    const isTask=/\b(entregar|finalizar|enviar|submeter|preparar|estudar para|comprar|pagar|resolver|ligar para|organizar|separar documentos)\b/.test(norm);
    const birthday=/\b(aniversario)\b/.test(norm);
    const explicitWeekly=days.length>0 && /\b(toda|todo|todas|todos|semanalmente|a cada semana)\b/.test(norm);
    const mentionsTime=/\b(?:as|às)\s*\d{1,2}(?:\s*(?:h|:|horas?)\d{0,2})?/.test(norm);
    let startTime='',endTime='',warn='',allDay=!mentionsTime;
    if(mentionsTime){
      const mt=norm.match(/\b(?:as|às)\s*(\d{1,2})(?:\s*(?:h|:)\s*(\d{1,2}))?(?:\s*(?:h|horas?))?(?:\s*da\s*(manha|tarde|noite))?/);
      if(mt){const hour=Number(mt[1]);let h=hour;const min=Number(mt[2]||0),pr=mt[3];
       if(pr==='noite'||pr==='tarde'){if(h<12)h+=12;}
       if(!pr&&hour>=1&&hour<=11){warn='Horário ambíguo: confirme se é de manhã ou à noite.';}
       if(h<24&&min<60){startTime=`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`; const total=h*60+min+60;endTime=`${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;if(total>=1440){endTime='23:59';warn='Revise o horário de término.';} }
      }
    }
    const title=cleanTitle(raw);
    items.push(item({kind:isTask?'task':'event',title:titleCase(title),day,startTime,endTime,category:cat,allDay,repeatWeekly:explicitWeekly,repeatYearly:birthday&&!/festa|jantar|comemoracao|celebracao/.test(norm),durationMinutes:60,source:raw,warning:warn,selected:!warn}));
  }
  return {items,ignored};
}
export function interpretRows(rows:unknown[][],today=iso(new Date())):Intake {
 const all:DraftItem[]=[],ignored:string[]=[];
 const text=(v:unknown)=>v instanceof Date?iso(v):String(v??'').trim();
 const norm=(v:unknown)=>unaccent(text(v)).replace(/[^a-z0-9]/g,'');
 if(rows.length>500){ignored.push('Foram analisadas as primeiras 500 linhas por segurança.');rows=rows.slice(0,500);}
 let hi=-1;let cols:Record<string,number>={};
 for(let i=0;i<Math.min(rows.length,12);i++){const found:Record<string,number>={};rows[i].forEach((v,j)=>{
   const k=norm(v);
   if(['dia','dias','diasdasemana','diadasemana','data'].includes(k))found.day=j;
   if(['atividade','compromisso','titulo','nome','disciplina','materia','descricao','evento','rotina'].includes(k))found.title=j;
   if(['inicio','horaentrada','horadeinicio','horainicio','entrada','de'].includes(k))found.start=j;
   if(['fim','horasaida','horadefim','horafim','saida','ate'].includes(k))found.end=j;
   if(['horario','horarios','periodo'].includes(k))found.range=j;
   if(['repetir','recorrencia','frequencia'].includes(k))found.repeat=j;
   if(['categoria','tipo','area','ambito'].includes(k))found.category=j;
 });if(found.day!==undefined&& (found.title!==undefined||found.start!==undefined||found.range!==undefined)){hi=i;cols=found;break;}}
 if(hi<0){for(const [index,row] of rows.entries()){const line=row.map(text).filter(Boolean).join(' ');if(!line)continue;const parsed=interpretText(line,today);all.push(...parsed.items);ignored.push(...parsed.ignored.map(msg=>`Linha ${index+1}: ${msg}`));}return {items:all,ignored};}
 for(let i=hi+1;i<rows.length;i++){
  const row=rows[i];if(!row.some(c=>text(c)))continue;
  const dayText=text(row[cols.day]);const days=parseWeekdays(dayText);let date=validDay(dayText)?dayText: null;
  const dayNum=dayText.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if(!date&&dayNum)date=interpretText(`dia ${dayNum[1]}/${dayNum[2]}${dayNum[3]?'/'+dayNum[3]:''}`,today).items[0]?.day||null;
  const title=text(cols.title===undefined?'Compromisso':row[cols.title])||'Compromisso';
  const range=cols.range!==undefined?timeRange(text(row[cols.range])):null;
  const start=range?.startTime || parseTime(row[cols.start]);const end=range?.endTime||parseTime(row[cols.end]);
  if(!start||!end||start>=end){ignored.push(`Linha ${i+1}: horário ausente ou inválido (${title}).`);continue;}
  const repeat=cols.repeat===undefined?true:/^(sim|s|semanal|toda|todos|true|1)$/i.test(text(row[cols.repeat]));
  if(days.length){for(const dow of days)all.push(item({title,day:nextWeekday(dow,today),startTime:start,endTime:end,repeatWeekly:repeat,category:getCategory(cols.category===undefined?title:text(row[cols.category])),source:`Linha ${i+1}`}));}
  else if(date){all.push(item({title,day:date,startTime:start,endTime:end,category:getCategory(cols.category===undefined?title:text(row[cols.category])),source:`Linha ${i+1}`}));}
  else ignored.push(`Linha ${i+1}: dia não identificado (${title}).`);
 }
 return {items:all,ignored};
}
