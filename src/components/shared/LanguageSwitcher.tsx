"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/navigation";
import { useTransition } from "react";

const locales = [
  { code: "sv", label: "SV" },
  { code: "fi", label: "FI" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <label className="relative block shrink-0">
      <span className="sr-only">Language selector</span>
      <select
        value={locale}
        onChange={(event) => handleLocaleChange(event.target.value)}
        disabled={isPending}
        className="min-w-[78px] shrink-0 appearance-none rounded-full border border-white/15 bg-surface px-3 py-2 pr-8 font-mono text-xs font-medium text-white outline-none transition duration-200 hover:border-white/30 focus:border-accent"
        aria-label="Select language"
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
        ▾
      </span>
    </label>
  );
}
