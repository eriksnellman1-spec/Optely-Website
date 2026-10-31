"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type SignInState } from "@/lib/actions/auth";

const initialState: SignInState = { error: null, email: "" };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          defaultValue={state.email}
          placeholder="erik@optely.fi"
          aria-invalid={Boolean(state.error)}
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Lösenord</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.error)}
          className="h-9"
        />
      </div>

      {state.error && (
        <p role="alert" className="flex items-start gap-2 text-xs text-status-red">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {state.error}
        </p>
      )}

      <Button type="submit" className="h-9 w-full" disabled={pending}>
        {pending ? "Loggar in…" : "Logga in"}
        {!pending && <ArrowRight />}
      </Button>
    </form>
  );
}
