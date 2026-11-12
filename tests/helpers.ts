import type { Db } from "@/db/client";
import { users } from "@/db/schema";

/** A user row for service tests; the password is never checked here. */
export async function seedUser(db: Db, email: string): Promise<string> {
  const [row] = await db
    .insert(users)
    .values({ email, name: email.split("@")[0]!, passwordHash: "scrypt$1$1$1$x$x" })
    .returning({ id: users.id });
  return row!.id;
}

/** A small but real JPEG of the given size: only the header Distil reads, then the end marker. */
export function fakeJpeg(width = 800, height = 600): Buffer {
  const sof = [
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 255,
    width >> 8,
    width & 255,
    0x03,
  ];
  const app0 = [
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0, 0, 1, 0, 1, 0, 0,
  ];
  return Buffer.from([0xff, 0xd8, ...app0, ...sof, ...new Array(9).fill(0), 0xff, 0xd9]);
}
