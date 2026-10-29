import {test} from "node:test";
import assert from "node:assert/strict";
import {getCategory,interpretText} from "../lib/intake.ts";
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
