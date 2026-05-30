import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/config";
import OnboardingForm from "./OnboardingForm";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = adminClient();
  const { data: studio } = await supabase
    .from("studios")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (studio) redirect("/owner/dashboard");

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        <OnboardingForm userId={user.id} />
      </div>
    </div>
  );
}
