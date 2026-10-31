"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav";
import { useLocalStorageBoolean } from "./use-local-storage";

type Dialog = "palette" | "shortcuts" | "new-contact" | "partner-checkin" | null;

type ShellContextValue = {
  dialog: Dialog;
  openDialog: (d: Exclude<Dialog, null>) => void;
  closeDialog: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** true medan användaren tryckt `g` och väntar på nästa bokstav */
  goPending: boolean;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell måste användas inom ShellProvider");
  return ctx;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [goPending, setGoPending] = useState(false);
  const goTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageBoolean("or:sidebar-collapsed", false);

  const openDialog = useCallback((d: Exclude<Dialog, null>) => setDialog(d), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const toggleSidebar = useCallback(
    () => setSidebarCollapsed(!sidebarCollapsed),
    [setSidebarCollapsed, sidebarCollapsed],
  );

  useEffect(() => {
    const clearGo = () => {
      setGoPending(false);
      if (goTimer.current) clearTimeout(goTimer.current);
      goTimer.current = null;
    };

    function onKeyDown(e: KeyboardEvent) {
      // ⌘K / Ctrl+K fungerar överallt, även i textfält.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDialog((d) => (d === "palette" ? null : "palette"));
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (dialog !== null) return;

      if (goTimer.current) {
        // Andra tangenten i en g-sekvens tillhör alltid navigeringen – stoppa vyernas egna genvägar.
        e.preventDefault();
        e.stopImmediatePropagation();
        const item = NAV_ITEMS.find((n) => n.key === e.key.toLowerCase());
        clearGo();
        if (item) router.push(item.href);
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setDialog("shortcuts");
      } else if (e.key === "g") {
        e.preventDefault();
        setGoPending(true);
        goTimer.current = setTimeout(clearGo, 1200);
      } else if (e.key === "[") {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === "c") {
        e.preventDefault();
        setDialog("new-contact");
      }
    }

    // Capture-fas: skalets genvägar körs före vyernas egna lyssnare.
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (goTimer.current) clearTimeout(goTimer.current);
    };
  }, [dialog, router, toggleSidebar]);

  const value = useMemo(
    () => ({ dialog, openDialog, closeDialog, sidebarCollapsed, toggleSidebar, goPending }),
    [dialog, openDialog, closeDialog, sidebarCollapsed, toggleSidebar, goPending],
  );

  return <ShellContext value={value}>{children}</ShellContext>;
}
