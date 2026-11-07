"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { saveOptelyCustomer, saveSbaBookings } from "@/lib/actions/customers";
import { cn } from "@/lib/utils";

export type OptelyCustomer = {
  companyId: string;
  name: string;
  city: string | null;
  project: string;
  invoiced: boolean;
  invoiceNote: string;
  maintenance: boolean;
  startedAt: string | null;
};

export function OptelyCustomerRow({ customer }: { customer: OptelyCustomer }) {
  const [state, setState] = useState(customer);
  const [saved, setSaved] = useState(false);
  const [, start] = useTransition();

  function save(next: OptelyCustomer) {
    setState(next);
    start(async () => {
      const r = await saveOptelyCustomer(next);
      if (!r.ok) toast.error(r.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <li className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_auto_auto_minmax(0,1fr)] md:items-center">
      <div className="min-w-0">
        <Link href={`/contacts/${state.companyId}`} className="truncate font-medium hover:underline">
          {state.name}
        </Link>
        <div className="text-xs text-muted-foreground">{state.city ?? "–"}</div>
      </div>
      <Input
        aria-label={`Projekt för ${state.name}`}
        defaultValue={state.project}
        placeholder="Projekt"
        onBlur={(e) => e.target.value !== state.project && save({ ...state, project: e.target.value })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.invoiced}
          onChange={(e) => save({ ...state, invoiced: e.target.checked })}
          className="accent-[var(--brand)]"
        />
        Fakturerad
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.maintenance}
          onChange={(e) => save({ ...state, maintenance: e.target.checked })}
          className="accent-[var(--brand)]"
        />
        Driftsavtal
      </label>
      <div className="flex items-center gap-2">
        <Input
          aria-label={`Fakturanotering för ${state.name}`}
          defaultValue={state.invoiceNote}
          placeholder="Fakturanotering"
          onBlur={(e) => e.target.value !== state.invoiceNote && save({ ...state, invoiceNote: e.target.value })}
        />
        <Check className={cn("size-4 shrink-0 text-status-green transition-opacity", saved ? "opacity-100" : "opacity-0")} />
      </div>
    </li>
  );
}

export type SbaCustomer = {
  companyId: string;
  name: string;
  city: string | null;
  thisMonth: string;
  lastMonth: string;
  bookingsNow: number;
  bookingsLast: number | null;
};

function Guarantee({ bookings }: { bookings: number }) {
  const met = bookings >= 3;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={cn("rounded px-1.5 py-0.5 font-medium", met ? "bg-status-green/15 text-status-green" : "bg-status-yellow/15 text-status-yellow")}>
        {met ? "Garantin uppnådd" : `${3 - bookings} kvar till garantin`}
      </span>
      <span className={met ? "text-foreground" : "text-muted-foreground"}>Fakturera: {met ? "ja (490 €)" : "nej"}</span>
    </div>
  );
}

export function SbaCustomerRow({ customer }: { customer: SbaCustomer }) {
  const [bookings, setBookings] = useState(customer.bookingsNow);
  const [, start] = useTransition();

  function save(value: number) {
    const next = Math.max(0, Math.round(value || 0));
    setBookings(next);
    start(async () => {
      const r = await saveSbaBookings({ companyId: customer.companyId, month: customer.thisMonth, bookings: next });
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <li className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.5fr)_minmax(0,1.3fr)] md:items-center">
      <div className="min-w-0">
        <Link href={`/contacts/${customer.companyId}`} className="truncate font-medium hover:underline">
          {customer.name}
        </Link>
        <div className="text-xs text-muted-foreground">{customer.city ?? "–"}</div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Bokningar denna månad</span>
        <Input
          type="number"
          min={0}
          aria-label={`Bokningar denna månad för ${customer.name}`}
          value={bookings}
          onChange={(e) => setBookings(Number(e.target.value))}
          onBlur={(e) => save(Number(e.target.value))}
          className="w-16 text-right font-mono tabular-nums"
        />
      </label>
      <Guarantee bookings={bookings} />
      <div className="text-xs text-muted-foreground">
        Förra månaden:{" "}
        {customer.bookingsLast === null ? (
          "–"
        ) : (
          <>
            <span className="font-mono text-foreground tabular-nums">{customer.bookingsLast}</span> bokningar ·{" "}
            {customer.bookingsLast >= 3 ? "garantin uppnådd · fakturerad" : "under garantin · ingen avgift"}
          </>
        )}
      </div>
    </li>
  );
}
