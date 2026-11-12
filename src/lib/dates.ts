/** Today's date in Copenhagen as yyyy-mm-dd, whatever the server's own time zone is. */
export function todayInCopenhagen(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(now);
}

/** A day as Danes write it, "12. november 2026", from yyyy-mm-dd. */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("da-DK", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
