import { pageMetadata } from "@/lib/seo";
import { getPublicPolicySettings } from "@/lib/public-policies";
import InformationPage from "../../_components/public/information-page";
import { notFound } from "next/navigation";

const slug = "privasi";

export async function generateMetadata() {
  const settings = await getPublicPolicySettings();
  const document = settings.documents.find((item) => item.slug === slug && item.status === "published");
  if (!settings.enabled || !document) {
    return pageMetadata("/kebijakan", "Dokumen tidak tersedia", "Dokumen kebijakan ini tidak tersedia.", { noindex: true });
  }
  return pageMetadata("/" + slug, document.title, document.description);
}

export default async function Page() {
  const settings = await getPublicPolicySettings();
  if (!settings.enabled || !settings.documents.some((item) => item.slug === slug && item.status === "published")) notFound();
  return <InformationPage slug={slug} />;
}
