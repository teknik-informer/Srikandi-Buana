import {siteOrigin} from '@/lib/site-origin';
import type {MetadataRoute} from 'next';
import {getPublications} from '@/lib/public-content';
import {publicPages} from '@/lib/seo';
import {programs} from '@/lib/srikandi';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const base=siteOrigin(),paths=[...Object.keys(publicPages),...programs.map(p=>'/program/'+p.id)],feed=await getPublications();return [...new Set(paths)].map(path=>({url:new URL(path,base).toString(),lastModified:new Date('2026-11-02T00:00:00.000Z')})).concat(feed.items.map(p=>({url:base+'/kabar/'+encodeURIComponent(p.id),lastModified:new Date(p.updated||p.date)})))}
