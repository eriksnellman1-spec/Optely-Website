import type { MetadataRoute } from "next";

/** Gör appen installerbar som webbapp (Dock på Mac, hemskärm på telefon). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Optely Outreach Runtime",
    short_name: "Optely O.R.",
    description: "Från kall kontakt till bokat möte.",
    lang: "sv-FI",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#08090b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
