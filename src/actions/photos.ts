"use server";

import { z } from "zod";
import { currentUser } from "@/auth/session";
import { withUser } from "@/db/client";
import { BadPhoto, LimitReached, NotFound, type LimitKind } from "@/services/errors";
import { addPhoto, approvePhoto, deletePhoto } from "@/services/photos";
import { readPhotoForm } from "@/lib/photo-form";
import { run, type Result } from "./result";

/**
 * Photos in, approved and deleted. Reading is its own route
 * (src/app/api/photos/[photoId]/read), so the phone can send the next
 * photo while the last one is read, and a failed reading can be tried
 * again without sending the photo again.
 */

export type UploadResult =
  | { ok: true; photoId: string }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "invalid"
        | "notFound"
        | "generic"
        | LimitKind
        | "type"
        | "size"
        | "dimensions";
    };

export async function uploadPhotoAction(form: FormData): Promise<UploadResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const workshopId = form.get("workshopId");
  const upload = await readPhotoForm(form);
  if (typeof workshopId !== "string" || !upload) return { ok: false, error: "invalid" };
  try {
    const photoId = await withUser(user.id, (tx) =>
      addPhoto(tx, user.id, workshopId, upload.bytes, Date.now(), upload.parts),
    );
    return { ok: true, photoId };
  } catch (error) {
    if (error instanceof BadPhoto) return { ok: false, error: error.reason };
    if (error instanceof LimitReached) return { ok: false, error: error.kind };
    if (error instanceof NotFound) return { ok: false, error: "notFound" };
    console.error("upload failed", error);
    return { ok: false, error: "generic" };
  }
}

export async function approvePhotoAction(photoId: string): Promise<Result> {
  return run(z.string().min(1), photoId, async (db, userId, id) => {
    await approvePhoto(db, userId, id);
    return undefined;
  });
}

export async function deletePhotoAction(photoId: string): Promise<Result> {
  return run(z.string().min(1), photoId, async (db, userId, id) => {
    await deletePhoto(db, userId, id);
    return undefined;
  });
}
