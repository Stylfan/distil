import { getTranslations } from "next-intl/server";
import { fillIn, type Operator } from "@/lib/operator";

export type LegalSection = { title: string; body?: string[]; list?: string[] };

/**
 * A privacy policy or terms, read from the messages and filled in with the
 * operator's details: a title, a lead, then numbered-free sections of
 * paragraphs and lists, in a column narrow enough to read.
 */
export async function LegalDocument({
  kind,
  op,
  extra = {},
}: {
  kind: "privacy" | "terms" | "demoPrivacy" | "demoTerms";
  op: Operator;
  /** Further words to fill in, e.g. a sentence chosen by whether hosting is named. */
  extra?: Record<string, string>;
}) {
  const t = await getTranslations("legal");
  const fill = (text: string) =>
    Object.entries(extra).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), fillIn(text, op));
  const sections = t.raw(`${kind}.sections`) as LegalSection[];
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">{t(`${kind}.title`)}</h1>
        <p className="text-[12px] text-slate">{t("updated")}</p>
        <p className="text-[15px] leading-relaxed text-ink">
          {fill(t.raw(`${kind}.lead`) as string)}
        </p>
      </header>
      {sections.map((s) => (
        <section key={s.title} className="flex flex-col gap-2.5">
          <h2 className="text-[17px] font-semibold">{s.title}</h2>
          {s.list && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-relaxed">
              {s.list.map((item) => (
                <li key={item}>{fill(item)}</li>
              ))}
            </ul>
          )}
          {s.body
            ?.map(fill)
            .filter((p) => p.trim() !== "")
            .map((p) => (
              <p key={p} className="text-[14px] leading-relaxed">
                {p}
              </p>
            ))}
        </section>
      ))}
    </article>
  );
}
