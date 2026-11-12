"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveOutlineAction } from "@/actions/outlines";
import { renameWorkshopAction } from "@/actions/workshops";
import { applyDeckEdit, type DeckRef } from "@/domain/deck-edit";
import type { Outline } from "@/domain/outline";
import { DeckEditContext, type SaveState } from "./editable";

/**
 * Editing the presentation where it stands. A switch in the toolbar turns
 * the slides' words into fields; a change is written back to the outline (or, for the
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
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
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
    <DeckEditContext.Provider
      value={{
        editing,
        save: (ref, value) => void save(ref, value),
        toggle: () => setEditing((e) => !e),
        state,
      }}
    >
      {children}
    </DeckEditContext.Provider>
  );
}
