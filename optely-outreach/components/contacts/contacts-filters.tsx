"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusDot } from "@/components/ui/status-dot";
import { COMPANY_STATUS, COMPANY_STATUS_ORDER } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const ALL = "__all";

export function ContactsFilters({
  status,
  city,
  q,
  statusCounts,
  cities,
  resultCount,
}: {
  status: Enums<"company_status"> | null;
  city: string | null;
  q: string;
  statusCounts: Record<Enums<"company_status">, number>;
  cities: { name: string; count: number }[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  const inputRef = useRef<HTMLInputElement>(null);

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Om q ändras utifrån (t.ex. via ⌘K) – synka fältet.
  if (q !== syncedQ) {
    setSyncedQ(q);
    if (q !== text.trim()) setText(q);
  }

  // Debounce sökfältet mot URL:en.
  useEffect(() => {
    if (text.trim() === q) return;
    const t = setTimeout(() => update("q", text.trim() || null), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update är stabil nog; vi vill bara reagera på text
  }, [text]);

  // "/" fokuserar sökfältet.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (e.defaultPrevented || e.key !== "/" || e.metaKey || e.ctrlKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hasFilters = Boolean(status || city || q);

  return (
    <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-70")}>
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setText("");
              e.currentTarget.blur();
            }
          }}
          placeholder="Sök bolag…"
          aria-label="Sök bolag"
          className="pr-8 pl-8"
        />
        <Kbd className="absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
      </div>

      <Select value={status ?? ALL} onValueChange={(v) => update("status", v === ALL ? null : v)}>
        <SelectTrigger aria-label="Filtrera på status" className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alla statusar</SelectItem>
          {COMPANY_STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              <span className="flex items-center gap-2">
                <StatusDot tone={COMPANY_STATUS[s].tone} />
                {COMPANY_STATUS[s].label}
                <span className="font-mono text-xs text-subtle">{statusCounts[s]}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={city ?? ALL} onValueChange={(v) => update("city", v === ALL ? null : v)}>
        <SelectTrigger aria-label="Filtrera på ort" className="min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alla orter</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c.name} value={c.name}>
              {c.name}
              <span className="ml-2 font-mono text-xs text-subtle">{c.count}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setText("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X />
          Rensa
        </Button>
      )}

      <span className="ml-auto font-mono text-xs text-subtle tabular-nums">
        {resultCount} bolag
      </span>
    </div>
  );
}
