"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContact, updateContact } from "@/lib/actions/contacts";

type Contact = {
  contactId: string | null;
  companyId: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
};

/** Redigera (eller lägg till) kontaktpersonen direkt i kortet. */
export function ContactEditor({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    role: contact.role ?? "",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = contact.contactId
        ? await updateContact({ contactId: contact.contactId, ...form })
        : await createContact({ companyId: contact.companyId, ...form });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success("Kontakten är sparad");
      onClose();
      router.refresh();
    });
  }

  const field = (key: keyof typeof form, label: string, type = "text", className = "") => (
    <div className={`space-y-1 ${className}`}>
      <Label htmlFor={`ce-${key}`}>{label}</Label>
      <Input
        id={`ce-${key}`}
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        autoFocus={key === (contact.phone ? "firstName" : "phone")}
      />
    </div>
  );

  return (
    <form onSubmit={save} aria-label="Redigera kontakt" className="space-y-3 rounded-md border border-border bg-background/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        {field("firstName", "Förnamn")}
        {field("lastName", "Efternamn")}
        {field("role", "Roll")}
        {field("phone", "Telefon", "tel")}
        {field("email", "E-post", "email", "col-span-2")}
      </div>
      {error && (
        <p role="alert" className="text-xs text-status-red">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Avbryt
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sparar…" : "Spara kontakt"}
        </Button>
      </div>
    </form>
  );
}

export function EditContactButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="text-muted-foreground">
      <Pencil /> {label}
    </Button>
  );
}
