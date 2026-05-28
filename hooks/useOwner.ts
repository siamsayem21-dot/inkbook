"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Studio } from "@/types";

export function useOwnerStudio() {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (error) setError(error.message);
      else setStudio(data as Studio);
      setLoading(false);
    });
  }, []);

  return { studio, loading, error };
}

export function useStudioRevenue(studioId: string, period: "month" | "year" = "month") {
  const [revenue, setRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studioId) return;
    const supabase = createClient();

    const now = new Date();
    const from =
      period === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        : new Date(now.getFullYear(), 0, 1).toISOString();

    supabase
      .from("bookings")
      .select("deposit_amount")
      .eq("studio_id", studioId)
      .eq("deposit_paid", true)
      .gte("created_at", from)
      .then(({ data }) => {
        const total = (data ?? []).reduce((sum, b) => sum + b.deposit_amount, 0);
        setRevenue(total);
        setLoading(false);
      });
  }, [studioId, period]);

  return { revenue, loading };
}
