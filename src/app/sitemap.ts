import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { servicePages, servicePagePath, type Locale } from "@/lib/servicePages";
import { caseStudies, caseStudyPath } from "@/lib/caseStudies";

const locales = ["sv", "fi", "en"];
const pages = ["", "/services", "/about", "/contact", "/process"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of locales) {
      const localePath = locale === "sv" ? "" : `/${locale}`;
      entries.push({
        url: `${SITE_URL}${localePath}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "weekly" : "monthly",
        priority: page === "" ? 1.0 : 0.8,
      });
    }
  }

  for (const page of servicePages) {
    for (const locale of locales as Locale[]) {
      entries.push({
        url: `${SITE_URL}${servicePagePath(locale, page)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }
  }

  for (const study of caseStudies) {
    for (const locale of locales as Locale[]) {
      entries.push({
        url: `${SITE_URL}${caseStudyPath(locale, study)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
