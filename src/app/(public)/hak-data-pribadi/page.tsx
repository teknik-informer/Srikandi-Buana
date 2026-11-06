import {pageMetadata} from "@/lib/seo";
import InformationPage from "../../_components/public/information-page";
import {informationPages} from "@/lib/information-pages";
const slug="hak-data-pribadi";
export const metadata=pageMetadata("/"+slug);
export default function Page(){return <InformationPage slug={slug}/>;}
