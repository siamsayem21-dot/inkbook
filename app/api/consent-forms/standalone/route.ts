import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    studioSlug,
    fullName,
    dateOfBirth,
    isMinor,
    bloodThinner,
    diabetic,
    skinCondition,
    pregnant,
    placement,
    artistName,
    designDescription,
    agreedToAftercare,
    signature,
  } = body as {
    studioSlug?: string;
    fullName?: string;
    dateOfBirth?: string;
    isMinor?: boolean;
    bloodThinner?: boolean;
    diabetic?: boolean;
    skinCondition?: boolean;
    pregnant?: boolean;
    placement?: string;
    artistName?: string;
    designDescription?: string;
    agreedToAftercare?: boolean;
    signature?: string;
  };

  if (
    !studioSlug ||
    !fullName ||
    !dateOfBirth ||
    !placement ||
    !artistName ||
    !designDescription ||
    !signature
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (isMinor) {
    return NextResponse.json(
      { error: "You must be 18 or older to complete this form." },
      { status: 422 }
    );
  }

  if (!agreedToAftercare) {
    return NextResponse.json(
      { error: "You must agree to the aftercare instructions." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  const { data: studioData } = await supabase
    .from("studios")
    .select("id")
    .eq("subdomain", studioSlug)
    .single();

  const studio = studioData as { id: string } | null;
  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("standalone_consent_forms" as never)
    .insert({
      studio_id: studio.id,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      is_minor: isMinor ?? false,
      blood_thinner: bloodThinner ?? false,
      diabetic: diabetic ?? false,
      skin_condition: skinCondition ?? false,
      pregnant: pregnant ?? false,
      tattoo_placement: placement,
      artist_name: artistName,
      design_description: designDescription,
      agreed_to_aftercare: agreedToAftercare ?? false,
      client_signature: signature,
    } as never)
    .select("id")
    .single();

  if (error) {
    console.error("[consent/standalone]", error.message);
    return NextResponse.json({ error: "Failed to save form." }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: (data as { id: string }).id });
}
