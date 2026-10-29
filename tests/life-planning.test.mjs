import {test} from "node:test";
import assert from "node:assert/strict";
import {alternativeTimes,categoryCounts} from "../lib/life-planning.ts";
const e=(id,day,start,end,extra={})=>({id,title:id,day,start_time:start,end_time:end,category:"personal",repeat_weekly:false,repeat_yearly:false,all_day:false,task_id:null,...extra});
test("sugestões não sobrepõem o trabalho e outros compromissos",()=>{
 const meeting=e("jantar","2026-11-02","19:00","20:00");
 const work=e("trabalho","2026-10-26","08:00","17:00",{repeat_weekly:true});
 const other=e("cinema","2026-11-02","17:00","19:00");
 const suggested=alternativeTimes(meeting,[meeting,work,other],"2026-11-02");
 assert.equal(suggested.length,3);
 assert(suggested.every(s=>s.start_time>="19:00" || s.day!=="2026-11-02"));
});
test("não move automaticamente eventos semanais, anuais ou de dia inteiro",()=>{
 const b=e("aniversário","2026-11-01","09:00","09:15",{repeat_yearly:true});
 assert.deepEqual(alternativeTimes(b,[],"2026-11-01"),[]);
 assert.deepEqual(alternativeTimes({...b,repeat_yearly:false,all_day:true},[],"2026-11-01"),[]);
});
test("resumo inclui todas as categorias e recorrências",()=>{
 const events=[e("trabalho","2026-10-26","08:00","16:00",{repeat_weekly:true,category:"work"}),e("aniversário","2025-10-29","09:00","09:15",{repeat_yearly:true,category:"birthday",all_day:true}),e("jantar","2026-10-29","20:00","22:00",{category:"dining"})];
 const counts=categoryCounts(events,"2026-10-26",7);
 assert.equal(counts.work,1);assert.equal(counts.birthday,1);assert.equal(counts.dining,1);
});
