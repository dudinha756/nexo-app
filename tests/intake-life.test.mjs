import {test} from "node:test";
import assert from "node:assert/strict";
import {getCategory,interpretText,interpretRows} from "../lib/intake.ts";
test("assistente classifica todas as áreas da vida",()=>{
 const cases=[["Jantar no restaurante","dining"],["Aniversário da minha mãe","birthday"],["Consulta com dentista","health"],["Reunião de trabalho","work"],["Musculação na academia","training"],["Sair com amigos","friends"],["Cinema à noite","leisure"],["Almoço em família","dining"],["Prova de Macroeconomia","class"],["Estudar inglês","study"]];
 for(const [text,category] of cases) assert.equal(getCategory(text),category,text);
});
test("comando de treino toda terça registra repetição semanal",()=>{
 const v=interpretText("Toda terça-feira tenho musculação às 17h","2026-10-29");
 assert.equal(v.items.length,1);
 assert.equal(v.items[0].category,"training");
 assert.equal(v.items[0].repeatWeekly,true);
 assert.equal(v.items[0].startTime,"17:00");
});
test("aniversário anual não precisa de hora",()=>{
 const v=interpretText("Dia 3 de novembro é aniversário do meu pai","2026-10-29");
 assert.equal(v.items.length,1);
 assert.equal(v.items[0].category,"birthday");
 assert.equal(v.items[0].repeatYearly,true);
 assert.equal(v.items[0].allDay,true);
});
test("jantar futuro pontual fica como categoria gastronômica",()=>{
 const v=interpretText("Sexta-feira jantar com amigas às 20h","2026-10-29");
 assert.equal(v.items.length,1);
 assert.equal(v.items[0].category,"dining");
 assert.equal(v.items[0].repeatWeekly,false);
 assert.equal(v.items[0].startTime,"20:00");
});

test("datas DD/MM/AAAA em texto e planilhas não são confundidas com o dia do mês atual",()=>{
 const today="2026-11-02";
 assert.equal(interpretText("Dia 14/12/2026 jantar com amigos às 20h",today).items[0]?.day,"2026-12-14");
 const rows=[["Data","Atividade","Início","Fim","Categoria"],["14/12/2026","Treino","17:00","18:00","Atividade física"],["03/11/2026","Reunião","09:00","10:00","Trabalho"]];
 const parsed=interpretRows(rows,today);
 assert.equal(parsed.items.length,2);
 assert.deepEqual(parsed.items.map(x=>[x.day,x.category]),[["2026-12-14","training"],["2026-11-03","work"]]);
});
test("importação preserva aniversários e compromissos sem horário como dia inteiro",()=>{
 const rows=[["Data","Atividade","Início","Fim","Categoria"],["14/11/2026","Aniversário da Lis","","","Aniversários"],["15/11/2026","Passeio em família","","","Família"]];
 const result=interpretRows(rows,"2026-11-02");
 assert.equal(result.items.length,2);
 assert.deepEqual(result.items.map(x=>[x.day,x.allDay,x.repeatYearly,x.category]),[["2026-11-14",true,true,"birthday"],["2026-11-15",true,false,"family"]]);
 assert.ok(result.items.every(x=>!x.startTime&&!x.endTime));
});
test("datas impossíveis não são importadas",()=>{
 const result=interpretRows([["Data","Atividade","Início","Fim"],["31/02/2027","Jantar","19:00","20:00"]],"2026-11-02");
 assert.equal(result.items.length,0);
 assert.equal(result.ignored.length,1);
});
