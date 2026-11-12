"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { saveDiagramAction, setDiagramIncludedAction } from "@/actions/diagrams";
import { withoutNode, type Diagram } from "@/domain/diagram";
import { cn } from "@/lib/cn";
import { DiagramView } from "./diagram-view";

/**
 * The drawing on a photo, redrawn, beside the photo it came from: the
 * clean version on top, and under it every shape and line in words, to
 * correct a label or take away what Distil saw that was not there.
 * Whether it gets a slide of its own is chosen here too.
 */
export function DiagramPanel({
  photoId,
  initial,
  include: initialInclude,
  width,
  height,
}: {
  photoId: string;
  initial: Diagram;
  include: boolean;
  width: number;
  height: number;
}) {
  const t = useTranslations("diagram");
  const router = useRouter();
  const [diagram, setDiagram] = useState(initial);
  const [include, setInclude] = useState(initialInclude);
  const [active, setActive] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [, start] = useTransition();
  const names = new Map(diagram.nodes.map((n) => [n.id, n.label || t("unnamed")]));

  const save = (next: Diagram) => {
    setDiagram(next);
    start(async () => {
      const result = await saveDiagramAction({ photoId, content: next });
      setFailed(!result.ok);
      if (result.ok) router.refresh();
    });
  };

  const field =
    "w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-[13px] text-ink hover:border-hairline focus:border-ink focus:bg-surface focus:outline-none";

  return (
    <section
      aria-labelledby="diagram-title"
      className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="diagram-title" className="text-[14px] font-semibold">
          {t("title")}
        </h3>
        <span className="text-[12px] text-slate">{t("hint")}</span>
        <span className="flex-1" />
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={include}
            onChange={(e) => {
              const next = e.target.checked;
              setInclude(next);
              start(async () => {
                const result = await setDiagramIncludedAction({ photoId, include: next });
                if (!result.ok) setInclude(!next);
              });
            }}
            className="size-4 accent-ink"
          />
          {t("include")}
        </label>
      </div>

      <div className="rounded-md border border-hairline-soft bg-white p-2">
        <DiagramView diagram={diagram} width={width} height={height} highlight={active} />
      </div>

      <input
        value={diagram.title}
        onChange={(e) => setDiagram({ ...diagram, title: e.target.value })}
        onBlur={() => save(diagram)}
        placeholder={t("titlePlaceholder")}
        aria-label={t("titleLabel")}
        className={cn(field, "text-[14px] font-medium")}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="text-[12px] text-slate">{t("shapes", { count: diagram.nodes.length })}</p>
          <ul className="flex flex-col gap-0.5">
            {diagram.nodes.map((n, i) => (
              <li
                key={n.id}
                className="flex items-center gap-2"
                onMouseEnter={() => setActive(n.id)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="w-16 shrink-0 text-[11px] text-slate">
                  {t(`shape.${n.shape}`)}
                </span>
                <input
                  value={n.label}
                  onChange={(e) =>
                    setDiagram({
                      ...diagram,
                      nodes: diagram.nodes.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                  onBlur={() => save(diagram)}
                  aria-label={t("shapeLabel", { number: i + 1 })}
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => save(withoutNode(diagram, n.id))}
                  aria-label={t("removeShape", { name: names.get(n.id) ?? "" })}
                  className="rounded p-1 text-slate/50 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[12px] text-slate">{t("lines", { count: diagram.edges.length })}</p>
          <ul className="flex flex-col gap-0.5">
            {diagram.edges.map((e, i) => (
              <li key={e.id} className="flex items-center gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-ink">
                  {names.get(e.from)} {e.arrow === "both" ? "↔" : e.arrow === "end" ? "→" : "—"}{" "}
                  {names.get(e.to)}
                </span>
                <input
                  value={e.label}
                  onChange={(ev) =>
                    setDiagram({
                      ...diagram,
                      edges: diagram.edges.map((x, j) =>
                        j === i ? { ...x, label: ev.target.value } : x,
                      ),
                    })
                  }
                  onBlur={() => save(diagram)}
                  placeholder={t("lineLabel")}
                  aria-label={t("lineLabelFor", { number: i + 1 })}
                  className={cn(field, "w-32")}
                />
                <button
                  type="button"
                  onClick={() =>
                    save({ ...diagram, edges: diagram.edges.filter((x) => x.id !== e.id) })
                  }
                  aria-label={t("removeLine", { number: i + 1 })}
                  className="rounded p-1 text-slate/50 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {failed && <p className="text-[12px] text-danger">{t("saveFailed")}</p>}
    </section>
  );
}
