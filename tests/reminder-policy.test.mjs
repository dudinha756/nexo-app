import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeReminderSettings,maySendReminder} from "../lib/reminder-policy.ts";

test("preferências antigas de aviso continuam válidas com limite diário padrão",()=>{
 const prefs=normalizeReminderSettings({enabled:true,lead:30,categories:["work","training","work"]});
 assert.deepEqual(prefs,{enabled:true,lead:30,categories:["work","training"],maxDaily:5});
});

test("limite escolhido é preservado e aplicado sem favorecer categorias",()=>{
 const prefs=normalizeReminderSettings({enabled:true,lead:15,categories:["family","study","dining"],maxDaily:3});
 assert.equal(prefs?.maxDaily,3);
 assert.equal(maySendReminder(2,prefs.maxDaily),true);
 assert.equal(maySendReminder(3,prefs.maxDaily),false);
});

test("limites inválidos não desativam preferências legadas e dados inválidos são rejeitados",()=>{
 assert.equal(normalizeReminderSettings({enabled:true,lead:60,categories:["birthday"],maxDaily:999})?.maxDaily,5);
 assert.equal(normalizeReminderSettings({enabled:"true",lead:30,categories:[]}),null);
 assert.equal(normalizeReminderSettings({enabled:true,lead:30,categories:[123]}),null);
 assert.equal(normalizeReminderSettings(null),null);
 assert.equal(maySendReminder(-1,5),false);
 assert.equal(maySendReminder(Number.NaN,5),false);
 assert.equal(maySendReminder(0,999),false);
});
