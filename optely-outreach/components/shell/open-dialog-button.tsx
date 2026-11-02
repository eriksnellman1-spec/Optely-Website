"use client";

import { Button } from "@/components/ui/button";
import { useShell } from "./shell-context";

export function OpenDialogButton({
  dialog,
  payload,
  children,
  variant = "outline",
  size = "default",
}: {
  dialog: "palette" | "shortcuts" | "new-contact" | "partner-checkin";
  payload?: Record<string, string>;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
}) {
  const { openDialog } = useShell();
  return (
    <Button variant={variant} size={size} onClick={() => openDialog(dialog, payload)}>
      {children}
    </Button>
  );
}
