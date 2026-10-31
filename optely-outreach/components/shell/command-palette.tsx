"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Handshake, Keyboard, Loader2, LogOut, UserPlus, User } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { StatusDot } from "@/components/ui/status-dot";
import { signOut } from "@/lib/actions/auth";
import { getPublicSupabaseEnv } from "@/lib/env";
import { COMPANY_STATUS } from "@/lib/labels";
import { NAV_ITEMS } from "@/lib/nav";
import { createClient } from "@/lib/supabase/browser";
import type { Enums } from "@/lib/supabase/types";
import { useShell } from "./shell-context";

type CompanyHit = { id: string; name: string; city: string | null; status: Enums<"company_status"> };
type ContactHit = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  role: string | null;
  company: { id: string; name: string } | null;
};

/** Tar bort tecken som har betydelse i PostgREST-filter. */
const sanitize = (s: string) => s.replace(/[%,()*\\]/g, " ").trim();

function useLiveSearch(query: string, enabled: boolean) {
  const [state, setState] = useState<{
    query: string;
    companies: CompanyHit[];
    contacts: ContactHit[];
    error: boolean;
  }>({ query: "", companies: [], contacts: [], error: false });

  const q = sanitize(query);
  const active = enabled && q.length >= 2 && getPublicSupabaseEnv() !== null;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const [first, ...rest] = q.split(/\s+/);
      const last = rest.join(" ");
      const contactFilter = last
        ? supabase
            .from("contacts")
            .select("id, first_name, last_name, email, role, company:companies(id, name)")
            .ilike("first_name", `%${first}%`)
            .ilike("last_name", `%${last}%`)
        : supabase
            .from("contacts")
            .select("id, first_name, last_name, email, role, company:companies(id, name)")
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);

      const [companies, contacts] = await Promise.all([
        supabase.from("companies").select("id, name, city, status").ilike("name", `%${q}%`).order("name").limit(6),
        contactFilter.limit(6),
      ]);
      if (cancelled) return;
      setState({
        query: q,
        companies: companies.data ?? [],
        contacts: contacts.data ?? [],
        error: Boolean(companies.error || contacts.error),
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, active]);

  const fresh = active && state.query === q;
  return {
    loading: active && !fresh,
    companies: fresh ? state.companies : [],
    contacts: fresh ? state.contacts : [],
    error: fresh && state.error,
  };
}

export function CommandPalette() {
  const router = useRouter();
  const { dialog, closeDialog, openDialog } = useShell();
  const open = dialog === "palette";
  const [query, setQuery] = useState("");
  const search = useLiveSearch(query, open);

  const run = (fn: () => void) => {
    closeDialog();
    setQuery("");
    fn();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          closeDialog();
          setQuery("");
        }
      }}
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="Sök bolag, kontakter, vyer eller åtgärder…" />
      <CommandList>
        <CommandEmpty>
          {search.loading ? "Söker…" : query.length < 2 ? "Inga träffar." : `Inga träffar för "${query}".`}
        </CommandEmpty>

        {(search.companies.length > 0 || search.loading) && (
          <CommandGroup heading="Bolag">
            {search.loading && search.companies.length === 0 && (
              <CommandItem disabled value={`__loading ${query}`}>
                <Loader2 className="animate-spin" />
                <span className="text-muted-foreground">Söker…</span>
              </CommandItem>
            )}
            {search.companies.map((c) => (
              <CommandItem
                key={c.id}
                value={`bolag ${c.name} ${c.city ?? ""} ${c.id}`}
                onSelect={() => run(() => router.push(`/contacts?q=${encodeURIComponent(c.name)}`))}
              >
                <Building2 />
                <span className="truncate">{c.name}</span>
                <span className="truncate text-xs text-subtle">{c.city}</span>
                <CommandShortcut>
                  <StatusDot tone={COMPANY_STATUS[c.status].tone} />
                  {COMPANY_STATUS[c.status].label}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {search.contacts.length > 0 && (
          <CommandGroup heading="Kontakter">
            {search.contacts.map((k) => {
              const name = [k.first_name, k.last_name].filter(Boolean).join(" ");
              return (
                <CommandItem
                  key={k.id}
                  value={`kontakt ${name} ${k.email ?? ""} ${k.company?.name ?? ""} ${k.id}`}
                  onSelect={() =>
                    run(() => router.push(`/contacts?q=${encodeURIComponent(k.company?.name ?? name)}`))
                  }
                >
                  <User />
                  <span className="truncate">{name}</span>
                  <span className="truncate text-xs text-subtle">
                    {[k.role, k.company?.name].filter(Boolean).join(" · ")}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {search.error && (
          <div className="px-3 py-2 text-xs text-status-red">Sökningen misslyckades. Försök igen.</div>
        )}

        <CommandGroup heading="Snabbåtgärder">
          <CommandItem value="ny kontakt skapa lägg till" onSelect={() => run(() => openDialog("new-contact"))}>
            <UserPlus />
            Ny kontakt
            <CommandShortcut>
              <Kbd>c</Kbd>
            </CommandShortcut>
          </CommandItem>
          <CommandItem
            value="logga partner-check-in partner checkin"
            onSelect={() => run(() => openDialog("partner-checkin"))}
          >
            <Handshake />
            Logga partner-check-in
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Gå till">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`gå till ${item.label} ${item.description}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                <Icon />
                {item.label}
                <span className="truncate text-xs text-subtle">{item.description}</span>
                <CommandShortcut>
                  <Kbd keys={["g", item.key]} />
                </CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Övrigt">
          <CommandItem value="kortkommandon genvägar hjälp" onSelect={() => run(() => openDialog("shortcuts"))}>
            <Keyboard />
            Visa kortkommandon
            <CommandShortcut>
              <Kbd>?</Kbd>
            </CommandShortcut>
          </CommandItem>
          <CommandItem value="logga ut" onSelect={() => run(() => void signOut())}>
            <LogOut />
            Logga ut
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
