"use server";

import { headers } from "next/headers";
import QRCode from "qrcode";
import { z } from "zod";
import { closePhoneLinks, createPhoneLink } from "@/services/phone-links";
import { run, type Result } from "./result";

/** The address the app is served from: DISTIL_URL, or the request's own host. */
async function origin(): Promise<string> {
  const configured = process.env.DISTIL_URL?.trim();
  if (configured) return new URL(configured).origin;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * A link for the phone into one workshop, and its QR code, drawn on the
 * server by the qrcode package (already used for two-step sign-in).
 */
export async function createPhoneLinkAction(
  workshopId: string,
): Promise<Result<{ url: string; qr: string; expiresAt: number }>> {
  const base = await origin();
  return run(z.string().min(1), workshopId, async (db, userId, id) => {
    const { token, expiresAt } = await createPhoneLink(db, userId, id);
    const url = `${base}/telefon/${token}`;
    const qr = await QRCode.toString(url, { type: "svg", margin: 1 });
    return { url, qr, expiresAt };
  });
}

export async function closePhoneLinksAction(workshopId: string): Promise<Result> {
  return run(z.string().min(1), workshopId, async (db, userId, id) => {
    await closePhoneLinks(db, userId, id);
    return undefined;
  });
}
