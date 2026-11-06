import {env} from '@/lib/runtime';
/** Server-only, best-effort delivery. It must never change the outcome of a committed transaction. */
export async function notifyOwner(owner:string,recipientId:string,sourceKey:string,title:string,body:string,href:string,category:'operasional'|'pesanan'|'sistem'){
 if(!env.DB||!href.startsWith('/dashboard')||href.startsWith('//'))return;
 try{await env.DB.prepare('INSERT INTO ecosystem_notifications(id,owner,recipient_id,source_key,category,title,body,href,created) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,recipient_id,source_key) DO NOTHING').bind(crypto.randomUUID(),owner,recipientId,sourceKey,category,title.slice(0,160),body.slice(0,500),href,new Date().toISOString()).run();}catch{/* Notification is auxiliary; log without exposing personal data. */console.warn('Notification delivery deferred');}
}
