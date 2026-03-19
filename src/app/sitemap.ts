import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const locales = ["sv", "fi", "en"];
const pages = ["", "/services", "/vvs", "/about", "/contact", "/process"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of locales) {
      const localePath = locale === "sv" ? "" : `/${locale}`;
      entries.push({
        url: `${SITE_URL}${localePath}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "weekly" : "monthly",
        priority: page === "" ? 1.0 : page === "/vvs" ? 0.9 : 0.8,
      });
    }
  }

  return entries;
}
