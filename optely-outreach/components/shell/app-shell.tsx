"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
  dateLabel: string;
  weekdayLabel: string;
  todayPlan: { channel: string; label: string } | null;
};

/** Håller badgen för Ringpass aktuell när triggern skapar nya ringuppgifter. */
function useTasksRealtime() {
  const router = useRouter();
  useEffect(() => {
    if (!getPublicSupabaseEnv()) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("shell-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 300);
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
        <Sidebar openCallTasks={data.openCallTasks} />
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
      <MobileNav openCallTasks={data.openCallTasks} />
      <CommandPalette />
      <ShortcutsDialog />
      <NewContactDialog />
      <PartnerCheckinDialog />
    </ShellProvider>
  );
}
