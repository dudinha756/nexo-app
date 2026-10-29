"use client";
import {useEffect} from "react";
import {authClient} from "@/lib/auth-client";
import {occurs,minutes,type EventRow} from "@/lib/schedule";
type Settings={enabled:boolean;lead:number;categories:string[]};
const isoToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
/** An optional in-browser reminder. No service worker, background push or server monitoring. */
export default function LifeReminders(){
 useEffect(()=>{
  let alive=true,userId="",events:EventRow[]=[];let lastRefresh=0;let inProgress=false;
  async function refresh(){
   if(!alive||inProgress)return;
   inProgress=true;
   try{
    const session=await authClient.getSession();
    const current=session.data?.user?.id||"";
    if(!current){userId="";events=[];return}
    userId=current;
    const r=await fetch("/api/data",{cache:"no-store"});
    if(!r.ok)return;
    const j=await r.json();
    if(!alive)return;
    events=Array.isArray(j.events)?j.events:[];lastRefresh=Date.now();
   }catch{}finally{inProgress=false}
  }
  function tick(){
   if(!alive||document.visibilityState!=="visible"||!userId)return;
   if(!("Notification" in window)||Notification.permission!=="granted")return;
   let prefs:Settings;
   try{
    const saved=localStorage.getItem("nexo:life-reminders:"+userId);
    if(!saved)return;
    prefs=JSON.parse(saved);
    if(!prefs?.enabled||![15,30,60].includes(prefs.lead)||!Array.isArray(prefs.categories))return;
   }catch{return}
   const date=isoToday(),now=new Date(),nowMin=now.getHours()*60+now.getMinutes();
   for(const e of events){
    const cat=e.custom_category_id?"custom:"+e.custom_category_id:e.category;
    if(!prefs.categories.includes(cat))continue;
    let body="";
    if(e.all_day){
     // Avoid inventing a clock time for birthdays and other all-day commitments.
     if(!occurs(e,date)||nowMin<480||nowMin>1200)continue;
     body=e.title+" é hoje. Confira seus planos.";
    }else{
     if(!occurs(e,date))continue;
     const starts=minutes(e.start_time);
     if(starts<nowMin||starts-nowMin>prefs.lead)continue;
     body=e.title+" começa às "+e.start_time;
    }
    const marker="nexo:sent:"+userId+":"+date+":"+e.id;
    if(localStorage.getItem(marker))continue;
    try{
     localStorage.setItem(marker,String(Date.now()));
     const n=new Notification("NEXO · "+(e.all_day?"Data importante":"Compromisso próximo"),{body,icon:"/icon.svg",tag:marker});
     n.onclick=()=>{window.focus();window.location.href="/vida";n.close()};
    }catch{localStorage.removeItem(marker)}
   }
  }
  const timer=setInterval(()=>{if(Date.now()-lastRefresh>300000)refresh().then(tick);else tick()},60000);
  const focused=()=>{if(document.visibilityState==="visible")refresh().then(tick)};
  document.addEventListener("visibilitychange",focused);
  window.addEventListener("focus",focused);
  refresh().then(tick);
  return ()=>{alive=false;clearInterval(timer);document.removeEventListener("visibilitychange",focused);window.removeEventListener("focus",focused)};
 },[]);
 return null;
}
