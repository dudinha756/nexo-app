import "server-only";
import webpush from "web-push";

/** Server-only VAPID keys: never send private key to the browser. */
export function pushClient() {
 const publicKey=process.env.VAPID_PUBLIC_KEY;
 const privateKey=process.env.VAPID_PRIVATE_KEY;
 if(!publicKey||!privateKey)throw new Error("Push VAPID configuration is missing.");
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||"https://nexo-rotina.vercel.app",publicKey,privateKey);
 return webpush;
}
const ALLOWED=["fcm.googleapis.com","fcm-xm.googleapis.com","updates.push.services.mozilla.com","push.services.mozilla.com","web.push.apple.com","push.apple.com"];
export function validPushEndpoint(value:unknown):value is string {
 if(typeof value!=="string"||value.length>4096)return false;
 try{
  const url=new URL(value);
  if(url.protocol!=="https:"||url.port&&url.port!=="443"||url.username||url.password)return false;
  const host=url.hostname.toLowerCase();
  return ALLOWED.includes(host)||host.endsWith(".push.apple.com")||host.endsWith(".notify.windows.com");
 }catch{return false}
}
export function publicVapidKey(){return process.env.VAPID_PUBLIC_KEY||""}
export function asSubscription(row:{endpoint:string;p256dh:string;auth:string}) {
 return {endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}};
}
