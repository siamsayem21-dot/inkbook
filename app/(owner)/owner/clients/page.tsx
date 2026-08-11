import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioId } from "@/lib/auth/config";
import ClientsTable from "@/components/owner/ClientsTable";

export const dynamic = "force-dynamic";

type ClientRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  notes: string | null;
  created_at: string;
};

export default async function ClientsPage() {
  const studioId = await getStudioId();
  if (!studioId) redirect("/login");

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, notes, created_at")
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  const clients = (data ?? []) as ClientRow[];
  const clientIds = clients.map((c) => c.id);

  // Real, directly-joinable enrichment — no invented schema:
  //   bookings.client_id  -> how many times this client has booked
  //   consent_forms.client_id -> whether a signed consent is on file
  //     (consent_forms has no studio_id column of its own; scoping is
  //     inherited safely here since clientIds only ever contains this
  //     studio's own client rows)
  //   blacklist.client_email/client_phone -> studio-scoped block list,
  //     matched by contact info (blacklist entries aren't linked via
  //     client_id — a client can be blocked before they even have a row)
  const [{ data: bookingsRaw }, { data: consentRaw }, { data: blacklistRaw }] = await Promise.all([
    clientIds.length
      ? supabase.from("bookings").select("client_id").in("client_id", clientIds)
      : Promise.resolve({ data: [] as { client_id: string }[] }),
    clientIds.length
      ? supabase.from("consent_forms").select("client_id").in("client_id", clientIds)
      : Promise.resolve({ data: [] as { client_id: string }[] }),
    supabase.from("blacklist").select("client_email, client_phone").eq("studio_id", studioId),
  ]);

  const bookingCounts: Record<string, number> = {};
  for (const b of (bookingsRaw ?? []) as { client_id: string }[]) {
    bookingCounts[b.client_id] = (bookingCounts[b.client_id] ?? 0) + 1;
  }

  const consentSet = new Set(((consentRaw ?? []) as { client_id: string }[]).map((c) => c.client_id));

  const blockedEmails = new Set(
    ((blacklistRaw ?? []) as { client_email: string | null; client_phone: string | null }[])
      .map((b) => b.client_email)
      .filter((e): e is string => !!e)
  );
  const blockedPhones = new Set(
    ((blacklistRaw ?? []) as { client_email: string | null; client_phone: string | null }[])
      .map((b) => b.client_phone)
      .filter((p): p is string => !!p)
  );

  const enriched = clients.map((c) => ({
    ...c,
    bookingCount: bookingCounts[c.id] ?? 0,
    hasConsent: consentSet.has(c.id),
    isBlacklisted: blockedEmails.has(c.email) || blockedPhones.has(c.phone),
  }));

  return <ClientsTable clients={enriched} />;
}
