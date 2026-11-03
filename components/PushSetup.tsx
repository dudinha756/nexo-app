"use client";
import {useCallback,useEffect,useState} from "react";
import {Bell,CheckCircle2,Send,ShieldCheck,Smartphone,Loader2} from "lucide-react";
import type {ReminderSettings} from "@/lib/reminder-policy";

type Props={userId:string;preferences:ReminderSettings;onActivated?:()=>void};
type SubscriptionJson={endpoint?:string;keys?:{p256dh?:string;auth?:string}};
const timezone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Fortaleza";
async function call(body:Record<string,unknown>){
 const r=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(j.error||"Não foi possível configurar o push.");
 return j;
}
function encodeKey(s:string):Uint8Array{
 const padding="=".repeat((4-s.length%4)%4);
 const decoded=atob((s+padding).replace(/-/g,"+").replace(/_/g,"/"));
 const array=new Uint8Array(decoded.length);
 for(let i=0;i<decoded.length;i++)array[i]=decoded.charCodeAt(i);
 return array;
}
function isAppleMobile(){
 if(typeof navigator==="undefined")return false;
 return /iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
}
function installed(){return window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone)}
async function installedSubscription(){
 const reg=await navigator.serviceWorker.getRegistration("/");
 return reg?.pushManager.getSubscription()||null;
}
export default function PushSetup({userId,preferences,onActivated}:Props){
 const [supported,setSupported]=useState(false),[needsInstall,setNeedsInstall]=useState(false),[active,setActive]=useState(false),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const refresh=useCallback(async()=>{
  setActive(false);setReady(false);
  const available=typeof window!=="undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const installNeeded=isAppleMobile()&&!installed();
  setNeedsInstall(installNeeded);setSupported(available&&!installNeeded);
  if(!userId||!available||installNeeded){setReady(true);return}
  try{
   const sub=await installedSubscription();
   if(sub){
    const state=await call({action:"status",endpoint:sub.endpoint});
    const yes=Boolean(state.active);
    setActive(yes);
    if(yes)localStorage.setItem("nexo:push-active:"+userId,"1");
    else localStorage.removeItem("nexo:push-active:"+userId);
   }else localStorage.removeItem("nexo:push-active:"+userId);
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setReady(true)}
 },[userId]);
 useEffect(()=>{void refresh()},[refresh]);
 async function enable(){
  if(!supported||!userId)return;
  setError("");setMessage("");setBusy(true);
  try{
   // On iOS the permission must be initiated directly by the button interaction.
   const permission=await Notification.requestPermission();
   if(permission!=="granted")throw Error("A permissão foi negada. Ajuste as notificações nas configurações do aparelho.");
   const cfg=await fetch("/api/push/subscribe",{cache:"no-store"});
   const config=await cfg.json();
   if(!cfg.ok||!config.configured||!config.publicKey)throw Error("O servidor push ainda não está disponível.");
   const reg=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
   await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:encodeKey(config.publicKey) as BufferSource});
   const info=sub.toJSON() as SubscriptionJson;
   if(!info.endpoint||!info.keys?.p256dh||!info.keys.auth)throw Error("Não foi possível registrar a assinatura de push do aparelho.");
   const enabledSettings={...preferences,enabled:true};
   await call({action:"subscribe",subscription:info,timezone:timezone(),settings:enabledSettings});
   localStorage.setItem("nexo:push-active:"+userId,"1");
   setActive(true);onActivated?.();
   setMessage("Push ativado neste aparelho. Você poderá receber lembretes com o NEXO fechado.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false);setReady(true)}
 }
 async function disable(){
  setBusy(true);setError("");setMessage("");
  try{
   const sub=await installedSubscription();
   if(sub){
    await call({action:"unsubscribe",endpoint:sub.endpoint});
    await sub.unsubscribe();
   }
   localStorage.removeItem("nexo:push-active:"+userId);
   setActive(false);setMessage("Push desativado neste aparelho.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 async function test(){
  setBusy(true);setError("");setMessage("");
  try{
   const sub=await installedSubscription();
   if(!sub)throw Error("Este aparelho ainda não está registrado.");
   await call({action:"test",endpoint:sub.endpoint});
   setMessage("Teste enviado. Confira as notificações do aparelho.");
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 return <div style={{border:"1px solid #e3d5ed",background:"#faf6fd",borderRadius:16,padding:16,marginTop:14}}>
  <h3 style={{margin:"0 0 9px",fontSize:16,display:"flex",gap:8,alignItems:"center"}}><Smartphone size={18}/> Notificações com o NEXO fechado</h3>
  <p style={{fontSize:12,lineHeight:1.6,color:"#756480"}}>Ative o push para receber avisos pelo sistema operacional, sem precisar manter a página aberta. As categorias, a antecedência e o limite diário acima também serão usados no push.</p>
  {needsInstall&&<p style={{fontSize:12,lineHeight:1.6,color:"#845c88"}}><strong>Primeiro, no iPhone:</strong> abra o NEXO no Safari, toque em <strong>Compartilhar → Adicionar à Tela de Início</strong>. Depois abra pelo ícone NEXO e volte aqui para ativar as notificações.</p>}
  {!needsInstall&&!supported&&ready&&<p style={{fontSize:12}}>Este navegador não oferece Push API e Service Worker. Experimente o Chrome ou outro navegador compatível, ou utilize o aplicativo da Tela de Início no iPhone.</p>}
  {!ready&&<p style={{fontSize:12}}>Verificando notificações deste aparelho...</p>}
  {ready&&supported&&<div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8}}>
   {!active?<button disabled={busy} onClick={enable} type="button" style={{background:"#8b76b1",border:0,borderRadius:10,color:"white",padding:"11px 13px",cursor:"pointer",fontWeight:700,fontSize:12,display:"inline-flex",gap:7,alignItems:"center"}}><Bell size={15}/>{busy?"Ativando...":"Ativar push neste aparelho"}</button>:
   <><span style={{fontSize:12,color:"#3f8060",display:"inline-flex",alignItems:"center",gap:5}}><CheckCircle2 size={16}/> Push ativo</span><button disabled={busy} type="button" onClick={test} style={{padding:"9px 11px",border:"1px solid #d6c3e0",borderRadius:9,background:"white",fontSize:12}}><Send size={14} style={{verticalAlign:"middle"}}/> Enviar teste</button><button disabled={busy} onClick={disable} type="button" style={{padding:"9px 11px",border:"1px solid #dccfe6",borderRadius:9,background:"white",fontSize:12}}>Desativar</button></>}
  </div>}
  {error&&<p role="alert" style={{fontSize:12,color:"#b34c6d",lineHeight:1.6}}>{error}</p>}
  {message&&<p role="status" style={{fontSize:12,color:"#4b8068",lineHeight:1.6}}>{message}</p>}
  <p style={{fontSize:11,color:"#8d8194",marginTop:12,display:"flex",gap:5,alignItems:"center"}}><ShieldCheck size={13}/> Requer sua autorização. O envio pode atrasar conforme o agendador e o aparelho.</p>
 </div>;
}
