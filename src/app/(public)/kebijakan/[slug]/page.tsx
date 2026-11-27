import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getPublicPolicySettings } from "@/lib/public-policies";
import InformationPage from "../../../_components/public/information-page";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const settings = await getPublicPolicySettings();
  const document = settings.documents.find((item) => item.slug === slug && item.status === "published");
  if (!settings.enabled || !document) {
    return pageMetadata("/kebijakan", "Dokumen tidak tersedia", "Dokumen kebijakan ini tidak tersedia.", { noindex: true });
  }
  return pageMetadata("/kebijakan/" + slug, document.title, document.description);
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const settings = await getPublicPolicySettings();
  if (!settings.enabled || !settings.documents.some((item) => item.slug === slug && item.status === "published")) notFound();
  return <InformationPage slug={slug} path={"/kebijakan/" + slug} />;
}
