"use client";

import { useEffect, useState } from "react";

import { getPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/browser";

export type Option = { id: string; label: string; hint?: string | null };

/** Laddar val (bolag/partners) när en dialog öppnas. */
export function useOptions(table: "companies" | "partners", enabled: boolean) {
  const [state, setState] = useState<{ options: Option[]; loaded: boolean; error: boolean }>({
    options: [],
    loaded: false,
    error: false,
  });

  useEffect(() => {
    if (!enabled || !getPublicSupabaseEnv()) return;
    let cancelled = false;
    const supabase = createClient();
    const request =
      table === "companies"
        ? supabase.from("companies").select("id, name, city").order("name").limit(1000)
        : supabase.from("partners").select("id, name, city").order("name");

    request.then(({ data, error }) => {
      if (cancelled) return;
      setState({
        options: (data ?? []).map((r) => ({ id: r.id, label: r.name, hint: r.city })),
        loaded: true,
        error: Boolean(error),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [table, enabled]);

  return state;
}
