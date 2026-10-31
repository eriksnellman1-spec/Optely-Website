"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Brain, Check, FilePlus2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createContextEntry,
  deleteContextEntry,
  saveContextEntry,
  type ContextEntry,
} from "@/lib/actions/brain";
import { formatDateTime } from "@/lib/format";
import { CONTEXT_KIND, CONTEXT_KIND_ORDER } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Kind = Enums<"context_kind">;
type Draft = { title: string; content: string; kind: Kind; isActive: boolean };

const toDraft = (e: ContextEntry): Draft => ({
  title: e.title,
  content: e.content,
  kind: e.kind,
  isActive: e.is_active,
});

const sameDraft = (a: Draft, b: Draft) =>
  a.title === b.title && a.content === b.content && a.kind === b.kind && a.isActive === b.isActive;

export function BrainEditor({ entries: initial, initialId }: { entries: ContextEntry[]; initialId: string | null }) {
  const [entries, setEntries] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.find((e) => e.id === initialId)?.id ?? initial[0]?.id ?? null,
  );
  // Utkast per post, så att inget försvinner när man byter post.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, startSaving] = useTransition();
  const [creating, startCreating] = useTransition();

  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const draft = selected ? (drafts[selected.id] ?? toDraft(selected)) : null;
  const isDirty = (e: ContextEntry) => Boolean(drafts[e.id] && !sameDraft(drafts[e.id], toDraft(e)));
  const dirty = selected ? isDirty(selected) : false;

  const grouped = useMemo(
    () =>
      CONTEXT_KIND_ORDER.map((kind) => ({ kind, items: entries.filter((e) => e.kind === kind) })).filter(
        (g) => g.items.length > 0,
      ),
    [entries],
  );
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  function select(id: string) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState(null, "", url);
  }

  function edit(patch: Partial<Draft>) {
    if (!selected || !draft) return;
    setDrafts((d) => ({ ...d, [selected.id]: { ...draft, ...patch } }));
  }

  const save = useCallback(() => {
    if (!selected || !draft || !dirty || saving) return;
    const id = selected.id;
    const snapshot = draft;
    // Optimistiskt: uppdatera listan direkt.
    setEntries((list) =>
      list.map((e) =>
        e.id === id
          ? { ...e, title: snapshot.title, content: snapshot.content, kind: snapshot.kind, is_active: snapshot.isActive }
          : e,
      ),
    );
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });

    startSaving(async () => {
      const result = await saveContextEntry({ id, ...snapshot });
      if (!result.ok) {
        // Återställ utkastet så att inget går förlorat.
        setDrafts((d) => ({ ...d, [id]: snapshot }));
        toast.error(result.error);
        return;
      }
      setEntries((list) => list.map((e) => (e.id === id ? { ...e, updated_at: result.data.updatedAt } : e)));
      toast.success("Sparat");
    });
  }, [selected, draft, dirty, saving]);

  // ⌘S / Ctrl+S sparar, j/k byter post när fokus inte är i ett fält.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
        return;
      }
      if (e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "j" || e.key === "k") {
        const i = flat.findIndex((x) => x.id === selectedId);
        const next = flat[Math.min(flat.length - 1, Math.max(0, i + (e.key === "j" ? 1 : -1)))];
        if (next) select(next.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, flat, selectedId]);

  // Varna innan man lämnar sidan med osparade ändringar.
  const anyDirty = entries.some(isDirty);
  useEffect(() => {
    if (!anyDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  function create() {
    startCreating(async () => {
      const result = await createContextEntry({ title: "Ny post", kind: draft?.kind ?? "other" });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEntries((list) => [...list, result.data]);
      select(result.data.id);
    });
  }

  function remove() {
    if (!selected) return;
    if (!window.confirm(`Ta bort "${selected.title}"? Det går inte att ångra.`)) return;
    const removed = selected;
    const index = flat.findIndex((e) => e.id === removed.id);
    const fallback = flat[index + 1] ?? flat[index - 1] ?? null;
    setEntries((list) => list.filter((e) => e.id !== removed.id));
    setSelectedId(fallback?.id ?? null);
    void deleteContextEntry(removed.id).then((r) => {
      if (!r.ok) {
        setEntries((list) => [...list, removed]);
        toast.error(r.error);
      } else {
        toast.success("Posten är borttagen");
      }
    });
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title="Företagshjärnan är tom"
        description="Börja med Optelys profil och erbjudande – AI:n använder texterna här när den skriver öppningsrader och manus."
        action={
          <Button onClick={create} disabled={creating}>
            <FilePlus2 />
            Skapa första posten
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <aside className="space-y-4 md:sticky md:top-20 md:self-start">
        <Button variant="outline" size="sm" className="w-full" onClick={create} disabled={creating}>
          <FilePlus2 />
          {creating ? "Skapar…" : "Ny post"}
        </Button>
        <nav className="flex gap-4 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Poster">
          {grouped.map((g) => (
            <div key={g.kind} className="min-w-44 md:min-w-0">
              <div className="mb-1 px-2 text-[11px] font-medium tracking-wide text-subtle uppercase">
                {CONTEXT_KIND[g.kind]}
              </div>
              <ul className="space-y-0.5">
                {g.items.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => select(e.id)}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        e.id === selectedId && "bg-accent text-foreground",
                        !e.is_active && "opacity-50",
                      )}
                    >
                      <span className="truncate">{e.title}</span>
                      {isDirty(e) && (
                        <span className="ml-auto size-1.5 shrink-0 rounded-full bg-status-yellow" title="Osparat" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className="hidden px-2 text-xs text-subtle md:block">
          <Kbd>j</Kbd> <Kbd>k</Kbd> byter post · <Kbd keys={["⌘", "S"]} /> sparar
        </p>
      </aside>

      {selected && draft ? (
        <section className="min-w-0 rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <Input
              value={draft.title}
              onChange={(e) => edit({ title: e.target.value })}
              aria-label="Rubrik"
              className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-1 text-base font-medium focus-visible:border-input"
            />
            <Select value={draft.kind} onValueChange={(v) => edit({ kind: v as Kind })}>
              <SelectTrigger aria-label="Typ" className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_KIND_ORDER.map((k) => (
                  <SelectItem key={k} value={k}>
                    {CONTEXT_KIND[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex h-7 cursor-pointer items-center gap-2 rounded-md border border-border px-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => edit({ isActive: e.target.checked })}
                className="accent-[var(--brand)]"
              />
              Används av AI
            </label>
          </div>

          <div className="p-3">
            <Label htmlFor="brain-content" className="sr-only">
              Innehåll (markdown)
            </Label>
            <Textarea
              id="brain-content"
              value={draft.content}
              onChange={(e) => edit({ content: e.target.value })}
              spellCheck
              placeholder="Skriv i markdown…"
              className="min-h-[440px] resize-y border-transparent bg-transparent px-1 font-mono text-[13px] leading-6 focus-visible:border-input"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2 text-xs text-subtle">
            <span className="font-mono tabular-nums">
              {draft.content.length.toLocaleString("sv-FI")} tecken
            </span>
            <span className="hidden sm:inline">Uppdaterad {formatDateTime(selected.updated_at)}</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={remove} aria-label="Ta bort posten">
                <Trash2 />
              </Button>
              {dirty ? (
                <span className="flex items-center gap-1.5 text-status-yellow">Osparade ändringar</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5" />
                  Sparat
                </span>
              )}
              <Button size="sm" onClick={save} disabled={!dirty || saving}>
                <Save />
                {saving ? "Sparar…" : "Spara"}
                <Kbd keys={["⌘", "S"]} className="ml-1 hidden sm:inline-flex [&_kbd]:border-black/20 [&_kbd]:bg-black/10 [&_kbd]:text-brand-foreground" />
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState icon={Brain} title="Välj en post" description="Välj en post i listan för att redigera den." />
      )}
    </div>
  );
}
