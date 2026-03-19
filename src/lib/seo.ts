export const SITE_URL = "https://www.optely.eu";
export const SITE_NAME = "Optely";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const localeNames: Record<string, string> = {
  sv: "sv_SE",
  fi: "fi_FI",
  en: "en_US",
};

export function buildCanonical(locale: string, path: string = "") {
  const localePath = locale === "sv" ? "" : `/${locale}`;
  return `${SITE_URL}${localePath}${path}`;
}

export function buildAlternates(path: string = "") {
  return {
    canonical: buildCanonical("sv", path),
    languages: {
      sv: buildCanonical("sv", path),
      fi: buildCanonical("fi", path),
      en: buildCanonical("en", path),
      "x-default": buildCanonical("sv", path),
    },
  };
}
