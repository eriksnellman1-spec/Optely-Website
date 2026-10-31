"use client";

import { Keyboard, LogOut, Settings } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { signOut } from "@/lib/actions/auth";
import { useShell } from "./shell-context";

export function UserMenu({ email }: { email: string | null }) {
  const { openDialog } = useShell();
  const initial = (email ?? "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Användarmeny"
        className="flex size-7 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-medium outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal">
          <span className="block text-[11px] text-subtle">Inloggad som</span>
          <span className="text-foreground">{email ?? "Okänd"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openDialog("shortcuts")}>
          <Keyboard />
          Kortkommandon
          <Kbd className="ml-auto">?</Kbd>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Inställningar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut />
              Logga ut
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
