import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["sv", "fi", "en"],
  defaultLocale: "sv",
  localePrefix: "as-needed",
});
