import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { hasRealAccounts } from "@/lib/demo-mode";
import { operator } from "@/lib/operator";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("legal"))("terms.title") };
}

/** The terms of this installation, in its operator's name; none when nobody is named. */
export default async function TermsPage() {
  const op = operator();
  if (!op) notFound();
  return <LegalDocument kind={hasRealAccounts() ? "terms" : "demoTerms"} op={op} />;
}
