"use client";

import { useEffect, useState } from "react";
import { ChevronRight, PanelRightClose, PanelRightOpen, ScrollText } from "lucide-react";

import { useLocalStorageBoolean } from "@/components/shell/use-local-storage";
import { Kbd } from "@/components/ui/kbd";
import { OfferBadge } from "@/components/offer/offer-badge";
import { cn } from "@/lib/utils";

export type ScriptEntry = { id: string; kind: string; title: string; content: string; offer: "optely" | "sba" | null };

/** Enkel markdown: rubriker (#), fetstil (**), listor och stycken. */
function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        const heading = /^#{1,3}\s+/.test(t);
        const content = t.replace(/^#{1,3}\s+/, "").replace(/^[-*]\s+/, "• ");
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-medium text-foreground">
              {p.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{p}</span>
          ),
        );
        return heading ? (
          <p key={i} className="pt-1 text-xs font-semibold tracking-wide text-foreground uppercase">
            {parts}
          </p>
        ) : (
          <p key={i}>{parts}</p>
        );
      })}
    </div>
  );
}

export function ScriptPanel({
  entries,
  firstName,
  companyName,
  offer,
  className,
}: {
  entries: ScriptEntry[];
  firstName: string | null;
  companyName: string;
  /** Bolagets erbjudande – visar rätt manus (Optely eller SBA). */
  offer: "optely" | "sba" | null;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean("or:script-collapsed", false);
  const [open, setOpen] = useState<string | null>(null);

  // m fäller ihop/ut manuset.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.key !== "m") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      setCollapsed(!collapsed);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, setCollapsed]);

  const fill = (s: string) =>
    s.replaceAll("{förnamn}", firstName ?? "…").replaceAll("{bolag}", companyName).replaceAll("{{förnamn}}", firstName ?? "…");

  const forOffer = entries.filter((e) => e.offer === null || offer === null || e.offer === offer);
  const scripts = forOffer.filter((e) => e.kind === "script");
  const objections = forOffer.filter((e) => e.kind === "objection");

  if (collapsed) {
    return (
      <aside className={cn("xl:w-11", className)}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-xs text-muted-foreground hover:text-foreground xl:h-40 xl:flex-col"
          aria-label="Visa manus"
        >
          <PanelRightOpen className="size-4" />
          <span className="xl:[writing-mode:vertical-rl]">Manus</span>
          <Kbd>m</Kbd>
        </button>
      </aside>
    );
  }

  return (
    <aside className={cn("min-w-0 xl:w-[320px]", className)}>
      <div className="rounded-lg border border-border bg-surface xl:sticky xl:top-20">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <ScrollText className="size-4 text-muted-foreground" />
            Manus
            <OfferBadge offer={offer} />
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Fäll ihop manus"
          >
            <Kbd>m</Kbd>
            <PanelRightClose className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-3">
          {entries.length === 0 && (
            <p className="text-sm text-subtle">
              Inget manus för det här erbjudandet ännu. Lägg till ett under Manus och sekvenser.
            </p>
          )}
          {scripts.map((s) => (
            <div key={s.id}>
              <Markdown text={fill(s.content)} />
            </div>
          ))}
          {objections.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-medium tracking-wide text-subtle uppercase">Invändningar</div>
              <ul className="space-y-1">
                {objections.map((o) => {
                  const isOpen = open === o.id;
                  return (
                    <li key={o.id} className="rounded-md border border-border">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : o.id)}
                        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm"
                        aria-expanded={isOpen}
                      >
                        <ChevronRight
                          className={cn("size-3.5 shrink-0 text-subtle transition-transform", isOpen && "rotate-90")}
                        />
                        <span className="truncate">{o.title.replace(/^Invändning:\s*/i, "")}</span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-border px-3 py-2">
                          <Markdown text={fill(o.content)} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
