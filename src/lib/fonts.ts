import localFont from "next/font/local";

// Self-hosted (latin subset from Fontsource) so builds don't depend on Google Fonts.

export const syne = localFont({
  src: [
    { path: "./fonts/syne-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/syne-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/syne-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-syne",
  display: "swap",
  preload: true,
});

export const dmSans = localFont({
  src: [
    { path: "./fonts/dm-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/dm-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});
