import { requireUser } from "@/auth/session";
import { DemoBanner } from "@/components/app/demo-banner";
import { PhoneBar, Sidebar } from "@/components/app/sidebar";
import { getDb, withUser } from "@/db/client";
import { maybeCleanDemos } from "@/services/demo-visits";
import { maybePurgeImages } from "@/services/photos";
import { countRequests } from "@/services/requests";
import { listWorkshops } from "@/services/workshops";

export const dynamic = "force-dynamic";

/**
 * The frame of every signed-in page. On a computer: a fixed sidebar with
 * the workshops, and the page beside it. On a phone: a slim bar on top and
 * the page under it, because the phone is for taking photos, not for
 * finding one's way around.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workshops = await withUser(user.id, (tx) => listWorkshops(tx, user.id));
  // While anyone uses the app: visits whose time is up, and images past their 24 hours, go.
  void maybeCleanDemos(getDb()).catch(() => undefined);
  void maybePurgeImages(getDb()).catch(() => undefined);
  const demo = user.demoExpiresAt;
  const requests = user.isAdmin ? await countRequests(getDb()) : null;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)] print:block">
      <aside className="sticky top-0 hidden h-screen md:block print:hidden">
        <Sidebar
          workshops={workshops
            .filter((w) => w.archivedAt === null)
            .map((w) => ({ id: w.id, name: w.name }))}
          user={{ name: user.name, email: demo === null ? user.email : "" }}
          requests={requests}
        />
      </aside>
      <PhoneBar />
      <main id="content" className="min-w-0 px-4 pb-12 md:px-8 print:p-0">
        {demo !== null && <DemoBanner expiresAt={demo} />}
        {children}
      </main>
    </div>
  );
}
