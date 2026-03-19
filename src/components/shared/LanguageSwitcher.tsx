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
    <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
      {locales.map((l) => (
        <button
          key={l.code}
          onClick={() => handleLocaleChange(l.code)}
          disabled={isPending}
          className={`rounded-full px-3 py-1 font-mono text-xs font-medium transition-all duration-200 ${
            locale === l.code
              ? "bg-accent text-white"
              : "text-muted hover:text-white"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
