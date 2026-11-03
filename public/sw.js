/* NEXO Web Push — background only, no offline caching or page interception. */
self.addEventListener("push", function(event) {
 let content={};
 try { content=event.data ? event.data.json() : {}; } catch {}
 const title=typeof content.title==="string"?content.title.slice(0,120):"NEXO";
 const body=typeof content.body==="string"?content.body.slice(0,240):"Você tem uma atualização na sua agenda.";
 const url=typeof content.url==="string"&&content.url.startsWith("/")&&!content.url.startsWith("//")?content.url:"/vida";
 event.waitUntil(self.registration.showNotification(title,{
  body,icon:"/apple-icon",badge:"/apple-icon",
  tag:"nexo:"+String(content.key||Date.now()).slice(0,120),
  data:{url},renotify:false
 }));
});
self.addEventListener("notificationclick", function(event) {
 event.notification.close();
 const safe=event.notification.data&&event.notification.data.url||"/vida";
 const path=typeof safe==="string"&&safe.startsWith("/")&&!safe.startsWith("//")?safe:"/vida";
 const dest=new URL(path,self.location.origin).href;
 event.waitUntil((async function() {
  const clientsList=await clients.matchAll({type:"window",includeUncontrolled:true});
  for(const client of clientsList) {
   if(new URL(client.url).origin!==self.location.origin) continue;
   if("navigate" in client) await client.navigate(dest);
   if("focus" in client) return client.focus();
  }
  if(clients.openWindow) return clients.openWindow(dest);
 })());
});
