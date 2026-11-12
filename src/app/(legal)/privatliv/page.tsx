import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal/legal-document";
import { hasRealAccounts } from "@/lib/demo-mode";
import { fillIn, operator } from "@/lib/operator";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("legal"))("privacy.title") };
}

/** The privacy policy, in the name of whoever runs this installation; none when nobody is named. */
export default async function PrivacyPage() {
  const op = operator();
  if (!op) notFound();
  const t = await getTranslations("legal");
  const hosting = fillIn(
    t.raw(op.hosting ? "privacy.hostingNamed" : "privacy.hostingSelf") as string,
    op,
  );
  return (
    <LegalDocument
      kind={hasRealAccounts() ? "privacy" : "demoPrivacy"}
      op={op}
      extra={{ hostingSentence: hosting }}
    />
  );
}
