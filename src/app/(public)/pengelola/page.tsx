import {pageMetadata} from "@/lib/seo";
import InformationPage from "../../_components/public/information-page";
import {getPublishedPolicy} from "@/lib/public-policy-store";
const slug="pengelola";
export async function generateMetadata(){const page=await getPublishedPolicy(slug);return pageMetadata("/"+slug,page?.title||"Dokumen kebijakan",page?.description||"Dokumen kebijakan Srikandi Buana.",{noindex:!page});}
export default function Page(){return <InformationPage slug={slug}/>;}
