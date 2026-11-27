import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getPublishedPolicy } from "@/lib/public-policy-store";
import InformationPage from "../../../_components/public/information-page";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const document = await getPublishedPolicy(slug);
  const path = "/kebijakan/" + slug;
  return pageMetadata(
    path,
    document?.title || "Dokumen kebijakan",
    document?.description || "Dokumen kebijakan Srikandi Buana.",
    { noindex: !document }
  );
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const document = await getPublishedPolicy(slug);
  if (!document) notFound();
  return <InformationPage slug={slug} />;
}
