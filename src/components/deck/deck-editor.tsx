"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Pencil } from "lucide-react";
import { saveOutlineAction } from "@/actions/outlines";
import { renameWorkshopAction } from "@/actions/workshops";
import { applyDeckEdit, type DeckRef } from "@/domain/deck-edit";
import type { Outline } from "@/domain/outline";
import { Button } from "@/components/ui/controls";
import { DeckEditContext } from "./editable";

/**
 * Editing the presentation where it stands. A switch turns the slides'
 * words into fields; a change is written back to the outline (or, for the
 * title, to the workshop), and the deck is built again from it, so the
 * outline and the presentation can never disagree.
 */
export function DeckEditor({
  workshop,
  outline,
  version,
  children,
}: {
  workshop: { id: string; name: string; heldOn: string };
  outline: Outline;
  version: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("deck");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "conflict" | "failed">("idle");
  const latest = useRef({ outline, version });

  // A newer outline from the server (after a save here, or a change elsewhere) is the one to edit.
  useEffect(() => {
    if (version >= latest.current.version) latest.current = { outline, version };
  }, [outline, version]);

  const save = async (ref: DeckRef, value: string) => {
    setState("saving");
    if (ref.kind === "workshopTitle") {
      const name = value.trim();
      if (!name) return setState("idle");
      const result = await renameWorkshopAction({ id: workshop.id, name, heldOn: workshop.heldOn });
      setState(result.ok ? "saved" : "failed");
      router.refresh();
      return;
    }
    const content = applyDeckEdit(latest.current.outline, ref, value);
    const result = await saveOutlineAction({
      workshopId: workshop.id,
      version: latest.current.version,
      content,
    });
    if (result.ok) {
      latest.current = { outline: content, version: result.data };
      setState("saved");
    } else setState(result.error === "conflict" ? "conflict" : "failed");
    router.refresh();
  };

  return (
    <DeckEditContext.Provider value={{ editing, save: (ref, value) => void save(ref, value) }}>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button
          size="sm"
          variant={editing ? "primary" : "secondary"}
          onClick={() => setEditing((e) => !e)}
          aria-pressed={editing}
        >
          {editing ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Pencil className="size-3.5" aria-hidden />
          )}
          {editing ? t("doneEditing") : t("edit")}
        </Button>
        <span role="status" className="text-[12px] text-slate">
          {editing && state === "idle" && t("editHint")}
          {state !== "idle" && t(`save.${state}`)}
        </span>
      </div>
      {children}
    </DeckEditContext.Provider>
  );
}
