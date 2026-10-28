/** Layout de grades em PDFs de horários com texto selecionável. Sem upload remoto. */
export type PdfWord = {str:string;x:number;y:number;width:number};
export type PdfLine = {y:number;words:PdfWord[];text:string};
export type PdfPageData = {lines:PdfLine[];tables:string[][];statements:string[]};
const weekdays=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const asDay=(s:string)=>{const m=plain(s).match(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:\s*-\s*feira)?\b/);return m?weekdays.indexOf(m[1]):-1};
const titleHeader=(s:string)=>/^(?:atividade|materia|disciplina|titulo|descricao|compromisso|evento|nome)$/i.test(plain(s).trim());
const dayHeader=(s:string)=>/^(?:dia(?:s)?|data|dia da semana|dias da semana)$/i.test(plain(s).trim());
const startHeader=(s:string)=>/^(?:inicio|entrada|hora entrada|hora inicio|hora de inicio)$/i.test(plain(s).trim());
const endHeader=(s:string)=>/^(?:fim|saida|hora saida|hora fim|hora de fim)$/i.test(plain(s).trim());
const rangeHeader=(s:string)=>/^(?:horario|horarios|periodo|turno)$/i.test(plain(s).trim());
const clock=(h:string,m?:string)=>{const a=Number(h),b=Number(m||0);return a>=0&&a<=23&&b>=0&&b<=59?`${String(a).padStart(2,'0')}:${String(b).padStart(2,'0')}`:null};
/** Extrai dois horários no mesmo segmento, sem confundir anos e datas com horas. */
export function pdfTimeRange(value:string):{start:string;end:string}|null{
 const s=plain(value);
 const match=s.match(/(?:^|[^\d])([01]?\d|2[0-3])\s*(?::|h)\s*([0-5]\d)\s*(?:[-–—]|a(?:te)?|as|às)\s*([01]?\d|2[0-3])\s*(?::|h)\s*([0-5]\d)(?!\d)/);
 if(match){const start=clock(match[1],match[2]),end=clock(match[3],match[4]);return start&&end&&start<end?{start,end}:null;}
 const hours=s.match(/\b([01]?\d|2[0-3])h\b\s*(?:[-–—]|a(?:te)?|as|às)\s*\b([01]?\d|2[0-3])h\b/);
 if(hours){const start=clock(hours[1]),end=clock(hours[2]);return start&&end&&start<end?{start,end}:null;}
 return null;
}
export function layoutLines(words:PdfWord[]):PdfLine[]{
 const clean=words.filter(w=>w&&typeof w.str==='string'&&w.str.trim()&&Number.isFinite(w.x)&&Number.isFinite(w.y)).slice(0,12000).map(w=>({...w,str:w.str.trim()}));
 clean.sort((a,b)=>b.y-a.y||a.x-b.x);
 const lines:PdfLine[]=[];
 for(const w of clean){let line=lines[lines.length-1];if(!line||Math.abs(line.y-w.y)>3.8){line={y:w.y,words:[],text:''};lines.push(line)}line.words.push(w);}
 for(const line of lines){line.words.sort((a,b)=>a.x-b.x);line.text=line.words.map(x=>x.str).join(' ').replace(/\s+/g,' ').trim()}
 return lines;
}
function headerCol(s:string):string|null{
 if(dayHeader(s))return 'Dia';if(titleHeader(s))return 'Atividade';if(startHeader(s))return 'Início';if(endHeader(s))return 'Fim';if(rangeHeader(s))return 'Horário';return null;
}
/** Mapeia tabelas com linha por atividade e quadros com dias nas colunas. */
export function interpretPdfLayout(words:PdfWord[]):PdfPageData{
 const lines=layoutLines(words),tables:string[][]=[],statements:string[]=[];
 let header:{x:number;label:string}[]|null=null;
 let grid:{x:number;day:string}[]|null=null;
 for(const line of lines){
  const tokens=line.words;
  // Cabeçalho de grade semanal: Horário | Segunda | Terça | Quarta ...
  const days=tokens.map(w=>({x:w.x,day:asDay(w.str)})).filter(w=>w.day>=0);
  const unique=[...new Map(days.map(w=>[w.day,w])).values()].sort((a,b)=>a.x-b.x);
  if(unique.length>=2&&!(pdfTimeRange(line.text))){grid=unique.map(d=>({x:d.x,day:weekdays[d.day]}));header=null;continue;}
  const headers=tokens.map(w=>({x:w.x,label:headerCol(w.str)})).filter((w):w is {x:number;label:string}=>w.label!==null);
  if(headers.some(h=>h.label==='Dia')&&headers.length>=3){header=headers;grid=null;tables.push(headers.map(h=>h.label));continue;}
  const range=pdfTimeRange(line.text);
  if(grid){
   // A primeira coluna da tabela é o horário; textos à direita formam disciplinas.
   const first=grid[0].x;const rangeWords=tokens.filter(w=>w.x<first-5).map(w=>w.str).join(' ');
   const slot=pdfTimeRange(rangeWords)||range;
   if(slot){
    const cells=new Map<string,string[]>();
    for(const word of tokens.filter(w=>w.x>=first-5)){
     const point=word.x+Math.min(word.width/2,35);
     let nearest=grid[0];for(const g of grid)if(Math.abs(g.x-point)<Math.abs(nearest.x-point))nearest=g;
     cells.set(nearest.day,[...(cells.get(nearest.day)||[]),word.str]);
    }
    for(const [day,parts] of cells){const name=parts.join(' ').trim();if(name&&!/^(?:-+|livre|intervalo|vago|recreio|sem aula|folga)$/i.test(plain(name))){
       if(tables.length===0)tables.push(['Dia','Atividade','Início','Fim']);
       tables.push([day,`Aula: ${name}`,slot.start,slot.end]);
    }}
    continue;
   }
  }
  if(header){
   const cols=header.map(h=>h.label),cells=cols.map(()=>[] as string[]);
   // Atribui cada item à coluna com início X mais próximo; limites são centros entre cabeçalhos.
   for(const w of tokens){let i=0;for(let j=0;j<header.length-1;j++)if(w.x>=(header[j].x+header[j+1].x)/2)i=j+1;cells[i].push(w.str)}
   const row=cells.map(parts=>parts.join(' ').trim());
   if(row.some(Boolean)&&!row.every((s,i)=>plain(s)===plain(cols[i]))){tables.push(row);continue}
  }
  if(line.text.trim())statements.push(line.text.trim());
 }
 return {lines,tables,statements};
}
