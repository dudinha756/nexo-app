import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutLines,interpretPdfLayout,pdfTimeRange} from '../lib/pdf-layout.ts';
const token=(str,x,y,width=60)=>({str,x,y,width});
test('detecta horários explícitos em textos de grades',()=>{
 assert.deepEqual(pdfTimeRange('08:30 – 16:30'),{start:'08:30',end:'16:30'});
 assert.deepEqual(pdfTimeRange('19h00 às 22h00'),{start:'19:00',end:'22:00'});
 assert.deepEqual(pdfTimeRange('7h-8h'),{start:'07:00',end:'08:00'});
 assert.equal(pdfTimeRange('13:40 até 12:40'),null);
});
test('organiza textos PDF em linhas por coordenada',()=>{
 const rows=layoutLines([token('Aula',100,570),token('Segunda',10,610),token('08:00',20,569)]);
 assert.equal(rows.length,2);assert.equal(rows[1].text,'08:00 Aula');
});
test('extrai grade de aulas com dias como colunas e horas nas linhas',()=>{
 const w=[token('Horário',10,700),token('Segunda',140,700),token('Terça',290,700),token('Quarta',440,700),token('19:00 - 20:30',10,660,100),token('Macroeconomia',140,660),token('Contabilidade',290,660),token('Direito',440,660)];
 const r=interpretPdfLayout(w);
 assert.deepEqual(r.tables[0],['Dia','Atividade','Início','Fim']);
 assert.deepEqual(r.tables.slice(1),[['segunda','Aula: Macroeconomia','19:00','20:30'],['terca','Aula: Contabilidade','19:00','20:30'],['quarta','Aula: Direito','19:00','20:30']]);
});
test('extrai tabela tradicional com colunas Dia Atividade Início Fim',()=>{
 const w=[token('Dia',10,800),token('Atividade',120,800),token('Início',280,800),token('Fim',400,800),token('Quinta',10,770),token('Trabalho',120,770),token('08:30',280,770),token('16:30',400,770)];
 const r=interpretPdfLayout(w);
 assert.deepEqual(r.tables,[['Dia','Atividade','Início','Fim'],['Quinta','Trabalho','08:30','16:30']]);
});
test('extrai linhas narrativas em PDF sem tabela',()=>{
 const r=interpretPdfLayout([token('Trabalho de quinta a terça, das 8h30 às 16h30',10,500)]);
 assert.equal(r.statements[0],'Trabalho de quinta a terça, das 8h30 às 16h30');
});
