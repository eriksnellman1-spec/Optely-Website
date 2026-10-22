import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["sv", "fi", "en"],
  defaultLocale: "sv",
  localePrefix: "as-needed",
  // Always serve "/" in Swedish instead of redirecting by browser language, so crawlers see stable URLs
  localeDetection: false,
});
