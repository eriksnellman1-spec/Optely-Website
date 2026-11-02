"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getPublicSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/browser";
import { CommandPalette } from "./command-palette";
import { MobileNav } from "./mobile-nav";
import { NewContactDialog } from "./new-contact-dialog";
import { PartnerCheckinDialog } from "./partner-checkin-dialog";
import { ShellProvider } from "./shell-context";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export type ShellData = {
  email: string | null;
  openCallTasks: number;
  /** Obehandlade svar och partnertips (siffran vid Hem). */
  noticeCount: number;
  dateLabel: string;
  weekdayLabel: string;
  todayPlan: { channel: string; label: string } | null;
};

const CLASSIFICATION: Record<string, string> = {
  positive: "Intresserad",
  neutral: "Neutralt",
  negative: "Nej tack",
  unsubscribe: "Avregistrering",
};

/** Håller siffrorna aktuella och visar en toast när ett svar eller partnertips kommer in. */
function useTasksRealtime() {
  const router = useRouter();
  useEffect(() => {
    if (!getPublicSupabaseEnv()) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase
      .channel("shell-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        const row = payload.new as { title?: unknown } | null;
        if (payload.eventType === "INSERT" && typeof row?.title === "string" && row.title.startsWith("Partnertips")) {
          toast.success("Nytt partnertips", { description: row.title.replace(/^Partnertips:\s*/, "") });
        }
        refresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "replies" }, (payload) => {
        const row = payload.new as { classification?: unknown; from_address?: unknown } | null;
        const kind = typeof row?.classification === "string" ? row.classification : "";
        if (kind !== "out_of_office" && kind !== "unclassified") {
          toast("Nytt svar", {
            description: [CLASSIFICATION[kind], typeof row?.from_address === "string" ? row.from_address : null]
              .filter(Boolean)
              .join(" · "),
          });
        }
        refresh();
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);
}

export function AppShell({ data, children }: { data: ShellData; children: React.ReactNode }) {
  useTasksRealtime();

  return (
    <ShellProvider>
      <div className="flex min-h-dvh">
        <Sidebar openCallTasks={data.openCallTasks} noticeCount={data.noticeCount} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            dateLabel={data.dateLabel}
            weekdayLabel={data.weekdayLabel}
            todayPlan={data.todayPlan}
            email={data.email}
          />
          <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
      <MobileNav openCallTasks={data.openCallTasks} noticeCount={data.noticeCount} />
      <CommandPalette />
      <ShortcutsDialog />
      <NewContactDialog />
      <PartnerCheckinDialog />
    </ShellProvider>
  );
}
