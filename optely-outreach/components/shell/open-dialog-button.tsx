"use client";

import { Button } from "@/components/ui/button";
import { useShell } from "./shell-context";

export function OpenDialogButton({
  dialog,
  children,
  variant = "outline",
}: {
  dialog: "palette" | "shortcuts" | "new-contact" | "partner-checkin";
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
}) {
  const { openDialog } = useShell();
  return (
    <Button variant={variant} onClick={() => openDialog(dialog)}>
      {children}
    </Button>
  );
}
