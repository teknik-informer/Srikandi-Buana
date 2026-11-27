import type { Metadata } from "next";
import InformationPage from "../../_components/public/information-page";
import { getPublicPolicyDocument } from "@/lib/policy-documents";
export const dynamic="force-dynamic";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {slug}=await params;
  const document=await getPublicPolicyDocument(slug);
  if(!document)return {title:"Halaman tidak ditemukan | Srikandi Buana",robots:{index:false,follow:false}};
  return {title:document.title+" | Srikandi Buana",description:document.description,alternates:{canonical:"/"+slug}};
}
export default async function Page({params}:Props){
  const {slug}=await params;
  return <InformationPage slug={slug}/>;
}
