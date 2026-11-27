import {siteOrigin} from "@/lib/site-origin";
import type {MetadataRoute} from "next";
import {getPublications} from "@/lib/public-content";
import {publicPages} from "@/lib/seo";
import {programs} from "@/lib/srikandi";
import {corePolicySlugs,getPublicPolicyDocuments} from "@/lib/policy-documents";
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const base=siteOrigin();
  const [feed,policies]=await Promise.all([getPublications(),getPublicPolicyDocuments()]);
  const visiblePolicySlugs=new Set(policies.map(doc=>doc.slug));
  const standardPaths=Object.keys(publicPages).filter(path=>{
    const slug=path.replace(/^\//,"");
    return !corePolicySlugs.has(slug)||visiblePolicySlugs.has(slug);
  });
  const paths=[...standardPaths,...programs.map(program=>"/program/"+program.id),...policies.map(doc=>"/"+doc.slug)];
  const lastModified=new Date();
  const pages=[...new Set(paths)].map(path=>({url:new URL(path,base).toString(),lastModified}));
  return pages.concat(feed.items.map(item=>({url:base+"/kabar/"+encodeURIComponent(item.id),lastModified:new Date(item.updated||item.date)})));
}
