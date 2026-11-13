"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BulkBar, DeleteConfirm, type DeleteRequest } from "@/components/bulk/delete-confirm";
import { OpenDialogButton } from "@/components/shell/open-dialog-button";
import { deleteAllPartners, deletePartners } from "@/lib/actions/delete";
import { formatDate, formatRelative } from "@/lib/format";
import { PARTNER_TYPE } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Partner = Pick<
  Tables<"partners">,
  "id" | "name" | "type" | "city" | "contact_name" | "phone" | "email" | "last_checkin_at"
> & { due: boolean; referred: number };

const WHAT = "Check-ins och partneruppgifter raderas också. Hänvisade bolag finns kvar, utan partner.";

export function PartnerTable({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [request, setRequest] = useState<DeleteRequest | null>(null);
  const chosen = partners.map((p) => p.id).filter((id) => selected.has(id));
  const allChecked = chosen.length > 0 && chosen.length === partners.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function done(r: Awaited<ReturnType<typeof deletePartners>>) {
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    toast.success(r.data.deleted === 1 ? "Partnern raderad" : `${r.data.deleted} partner raderade`);
    setSelected(new Set());
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-2">
      <BulkBar
        selected={chosen.length}
        visible={partners.length}
        allChecked={allChecked}
        onToggleAll={() => setSelected(allChecked ? new Set() : new Set(partners.map((p) => p.id)))}
        onClear={() => setSelected(new Set())}
        onDeleteSelected={() =>
          setRequest({
            title: `Radera ${chosen.length} partner?`,
            description: `${chosen.length} markerade partner tas bort. ${WHAT}`,
            count: chosen.length,
            run: async () => done(await deletePartners(chosen)),
          })
        }
        onDeleteAll={() =>
          setRequest({
            title: `Radera alla ${partners.length} partner?`,
            description: `Hela partnerlistan tas bort. ${WHAT}`,
            count: partners.length,
            requireWord: true,
            run: async () => done(await deleteAllPartners()),
          })
        }
        deleteAllLabel={`Radera alla partner (${partners.length})`}
      />
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="h-8 border-b border-border text-left text-[11px] tracking-wide text-subtle uppercase">
              <th className="w-9 pl-3" aria-label="Markera" />
              <th className="px-3 font-medium">Partner</th>
              <th className="px-3 font-medium max-md:hidden">Kontakt</th>
              <th className="px-3 font-medium">Senast hörd</th>
              <th className="px-3 text-right font-medium max-sm:hidden">Hänvisade</th>
              <th className="w-0 px-3" />
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} className={cn("group h-11 border-b border-border/60 last:border-0", selected.has(p.id) && "bg-surface-2")}>
                <td className="pl-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Markera ${p.name}`}
                    className="size-4 align-middle accent-[var(--brand)]"
                  />
                </td>
                <td className="px-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{[PARTNER_TYPE[p.type], p.city].filter(Boolean).join(" · ")}</div>
                </td>
                <td className="px-3 text-xs text-muted-foreground max-md:hidden">
                  {[p.contact_name, p.phone, p.email].filter(Boolean).join(" · ")}
                </td>
                <td className="px-3">
                  <span className={cn("text-xs", p.due ? "text-status-yellow" : "text-muted-foreground")}>
                    {p.last_checkin_at ? formatRelative(p.last_checkin_at) : "aldrig"}
                    {p.due && " · behöver höras"}
                  </span>
                  {p.last_checkin_at && <div className="font-mono text-[11px] text-subtle">{formatDate(p.last_checkin_at)}</div>}
                </td>
                <td className="px-3 text-right font-mono tabular-nums max-sm:hidden">{p.referred}</td>
                <td className="px-2">
                  <div className="flex items-center justify-end gap-1">
                    <OpenDialogButton dialog="partner-checkin" payload={{ partnerId: p.id }} size="sm" variant="ghost">
                      Check-in
                    </OpenDialogButton>
                    <button
                      type="button"
                      aria-label={`Radera ${p.name}`}
                      title="Radera"
                      onClick={() =>
                        setRequest({
                          title: `Radera ${p.name}?`,
                          description: `Partnern tas bort. ${WHAT}`,
                          count: 1,
                          run: async () => done(await deletePartners([p.id])),
                        })
                      }
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-subtle opacity-60 transition hover:bg-status-red/10 hover:text-status-red group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteConfirm request={request} onClose={() => setRequest(null)} />
    </div>
  );
}
