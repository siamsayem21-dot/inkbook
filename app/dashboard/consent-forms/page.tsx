export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import ConsentFormsTable, {
  type ConsentFormRow,
} from "./_components/ConsentFormsTable";

export default async function ConsentFormsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  const studio = studioData as { id: string } | null;
  if (!studio) redirect("/register");

  const { data: formsRaw } = await supabase
    .from("standalone_consent_forms" as never)
    .select("*")
    .eq("studio_id" as never, studio.id)
    .order("signed_at" as never, { ascending: false });

  const forms = (formsRaw ?? []) as ConsentFormRow[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Consent Forms</h1>
        <p className="text-white/40 text-sm">
          {forms.length} form{forms.length !== 1 ? "s" : ""} submitted
        </p>
      </div>

      <ConsentFormsTable forms={forms} />
    </div>
  );
}
