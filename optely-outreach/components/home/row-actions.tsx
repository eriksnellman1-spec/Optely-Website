"use client";

import { useState, useTransition } from "react";
import { Check, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { markMeetingHeld, markMeetingNoShow } from "@/lib/actions/meetings";
import { completeTask } from "@/lib/actions/ringpass";
import type { ActionResult } from "@/lib/actions/types";

/** Kör en åtgärd optimistiskt: raden tonas ut direkt och kommer tillbaka om något går fel. */
function useOptimisticDone() {
  const [done, setDone] = useState(false);
  const [, start] = useTransition();
  function run(action: () => Promise<ActionResult>, message: string) {
    setDone(true);
    start(async () => {
      const r = await action();
      if (!r.ok) {
        setDone(false);
        toast.error(r.error);
      } else {
        toast.success(message);
      }
    });
  }
  return { done, run };
}

export function MeetingActions({ meetingId, children }: { meetingId: string; children: React.ReactNode }) {
  const { done, run } = useOptimisticDone();
  if (done) return null;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      {children}
      <div className="ml-auto flex gap-1.5">
        <Button size="sm" variant="outline" onClick={() => run(() => markMeetingHeld(meetingId), "Behovssamtal klart")}>
          <Check /> Genomfört
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => run(() => markMeetingNoShow(meetingId), "Nytt samtal ligger först i kön")}
        >
          <UserX /> Dök inte upp
        </Button>
      </div>
    </li>
  );
}

export function TaskDoneButton({ taskId, label = "Läst" }: { taskId: string; label?: string }) {
  const { done, run } = useOptimisticDone();
  return (
    <Button size="sm" variant="ghost" disabled={done} onClick={() => run(() => completeTask(taskId), "Klart")}>
      <Check /> {done ? "Klart" : label}
    </Button>
  );
}
