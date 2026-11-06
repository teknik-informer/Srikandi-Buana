import {env} from '@/lib/runtime';
import {siteDefaults,type SiteSettings} from './settings-config';
export async function getSiteSettings():Promise<SiteSettings>{try{if(!env.DB)return {...siteDefaults};const row=await env.DB.prepare("SELECT data FROM settings WHERE key='public'").first();if(!row)return {...siteDefaults};const raw=JSON.parse(row.data as string);return Object.fromEntries(Object.entries(siteDefaults).map(([k,v])=>[k,typeof raw[k]==='string'?raw[k]:v])) as SiteSettings}catch{return {...siteDefaults}}}
