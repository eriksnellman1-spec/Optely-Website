"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  BulkBar,
  DeleteConfirm,
  type DeleteRequest,
} from "@/components/bulk/delete-confirm";

import { OfferBadge } from "@/components/offer/offer-badge";
import { StatusDot } from "@/components/ui/status-dot";
import {
  deleteCompanies,
  deleteCompaniesMatching,
  type CompanyFilter,
} from "@/lib/actions/delete";
import { formatDateTime, formatRelative } from "@/lib/format";
import { COMPANY_STATUS } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Row = Pick<
  Tables<"company_overview">,
  | "id"
  | "name"
  | "city"
  | "industry"
  | "status"
  | "do_not_contact"
  | "contact_count"
  | "open_task_count"
  | "last_activity_at"
  | "offer"
>;

const OFFER_NAME = { all: "", optely: "Optely-", sba: "SBA-" } as const;

export function CompanyTable({
  companies,
  filter,
  matching,
  filtered,
}: {
  companies: Row[];
  filter: CompanyFilter;
  /** Antal bolag som matchar filtret (kan vara fler än raderna som visas). */
  matching: number;
  filtered: boolean;
}) {
  const now = new Date();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [request, setRequest] = useState<DeleteRequest | null>(null);
  const ids = useMemo(
    () => companies.map((c) => c.id).filter((id): id is string => Boolean(id)),
    [companies],
  );
  const chosen = ids.filter((id) => selected.has(id));
  const allChecked = chosen.length > 0 && chosen.length === ids.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function runDelete(list: string[]) {
    const r = await deleteCompanies(list);
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    toast.success(
      r.data.deleted === 1
        ? "Bolaget raderat"
        : `${r.data.deleted} bolag raderade`,
    );
    setSelected(new Set());
    router.refresh();
    return true;
  }

  const what =
    "Kontakter, samtal, mejl, uppgifter, möten och affärer som hör till dem raderas också.";
  const allLabel = `Radera alla ${OFFER_NAME[filter.offer]}bolag${filtered ? " i filtret" : ""} (${matching})`;

  return (
    <div className="space-y-2">
      <BulkBar
        selected={chosen.length}
        visible={ids.length}
        allChecked={allChecked}
        onToggleAll={() => setSelected(allChecked ? new Set() : new Set(ids))}
        onClear={() => setSelected(new Set())}
        onDeleteSelected={() =>
          setRequest({
            title: `Radera ${chosen.length} bolag?`,
            description: `${chosen.length} markerade bolag tas bort. ${what}`,
            count: chosen.length,
            run: () => runDelete(chosen),
          })
        }
        onDeleteAll={() =>
          setRequest({
            title: `Radera alla ${matching} ${OFFER_NAME[filter.offer]}bolag${filtered ? " i filtret" : ""}?`,
            description: `Alla ${matching} bolag som ${filtered ? "matchar filtret" : "finns i registret" + (filter.offer !== "all" ? " för " + (filter.offer === "sba" ? "SBA" : "Optely") : "")} tas bort, även bolag du har ringt eller har affärer med. ${what}`,
            count: matching,
            requireWord: true,
            run: async () => {
              const r = await deleteCompaniesMatching(filter);
              if (!r.ok) {
                toast.error(r.error);
                return false;
              }
              toast.success(`${r.data.deleted} bolag raderade`);
              setSelected(new Set());
              router.refresh();
              return true;
            },
          })
        }
        deleteAllLabel={allLabel}
      />
      {/* Kolumnerna anpassar sig efter tabellens egen bredd (container queries), inte fönstrets –
        annars äter sidomenyn upp platsen för bolagsnamnet i mellanstora fönster. */}
      <div className="@container overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="h-8 border-b border-border text-left text-[11px] font-medium tracking-wide text-subtle uppercase">
              <th className="w-9 pl-3" aria-label="Markera" />
              <th className="px-3 font-medium">Bolag</th>
              <th className="w-32 px-3 font-medium @max-2xl:hidden">Ort</th>
              <th className="w-32 px-3 font-medium">Status</th>
              <th className="w-24 px-3 text-right font-medium @max-3xl:hidden">
                Kontakter
              </th>
              <th className="w-36 px-3 text-right font-medium @max-2xl:hidden">
                Senaste aktivitet
              </th>
              <th className="w-10" aria-label="Radera" />
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => {
              const status = c.status ? COMPANY_STATUS[c.status] : null;
              return (
                <tr
                  key={c.id}
                  className={cn(
                    "group h-9 border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2",
                    c.id && selected.has(c.id) && "bg-surface-2",
                  )}
                >
                  <td className="pl-3">
                    {c.id && (
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => c.id && toggle(c.id)}
                        aria-label={`Markera ${c.name}`}
                        className="size-4 align-middle accent-[var(--brand)]"
                      />
                    )}
                  </td>
                  <td className="px-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <OfferBadge offer={c.offer} />
                      {c.do_not_contact && (
                        <span className="shrink-0 rounded bg-status-red/15 px-1 text-[10px] text-status-red">
                          Avregistrerad
                        </span>
                      )}
                      {(c.open_task_count ?? 0) > 0 && (
                        <span
                          className="shrink-0 rounded bg-brand/15 px-1 font-mono text-[10px] text-brand"
                          title="Öppna uppgifter"
                        >
                          {c.open_task_count}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-subtle @2xl:hidden">
                      {[
                        c.city,
                        c.industry,
                        c.last_activity_at &&
                          formatRelative(c.last_activity_at, now),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="truncate px-3 text-muted-foreground @max-2xl:hidden">
                    {c.city ?? "–"}
                  </td>
                  <td className="px-3">
                    {status && (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <StatusDot tone={status.tone} />
                        <span
                          className={cn(
                            status.tone === "brand" && "text-brand",
                          )}
                        >
                          {status.label}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 text-right font-mono text-muted-foreground tabular-nums @max-3xl:hidden">
                    {c.contact_count ?? 0}
                  </td>
                  <td
                    className="px-3 text-right font-mono text-xs text-muted-foreground tabular-nums @max-2xl:hidden"
                    title={
                      c.last_activity_at
                        ? formatDateTime(c.last_activity_at)
                        : undefined
                    }
                  >
                    {formatRelative(c.last_activity_at, now)}
                  </td>
                  <td className="pr-2 text-right">
                    <button
                      type="button"
                      aria-label={`Radera ${c.name}`}
                      title="Radera"
                      onClick={() =>
                        c.id &&
                        setRequest({
                          title: `Radera ${c.name}?`,
                          description: `Bolaget tas bort. ${what}`,
                          count: 1,
                          run: () => runDelete([c.id as string]),
                        })
                      }
                      className="inline-flex size-7 items-center justify-center rounded-md text-subtle opacity-60 transition hover:bg-status-red/10 hover:text-status-red group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <DeleteConfirm request={request} onClose={() => setRequest(null)} />
    </div>
  );
}
