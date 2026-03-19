# Optely Website — Build Log

## What was built

Full Next.js 14 website for Optely, an AI consulting & automation agency in Österbotten, Finland.

**Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, tsParticles, next-intl v4

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage (Hero, TrustBar, Strengths, Services, HowWeWork, ProcessSteps, Testimonials, WhyOptely, BookingSection, FAQ) |
| `/services` | Expanded services grid |
| `/process` | How we work — timeline + steps |
| `/vvs` | VVS Automation System product page |
| `/about` | Team (Erik + Joas), company story, values |
| `/contact` | Contact form + Calendly embed |

All pages exist in three locales: `sv` (default, no prefix), `/fi`, `/en`

---

## i18n Setup

- **next-intl v4** with `localePrefix: "as-needed"`
- Default locale: `sv` (Swedish) — served at `/`
- Finnish: `/fi`, English: `/en`
- Config centralized in `src/routing.ts` → used by middleware, i18n, and navigation
- Translation files: `messages/sv.json`, `messages/fi.json`, `messages/en.json`

---

## Key Decisions & Fixes

### Language switcher
- Uses `createNavigation(routing)` from `next-intl/navigation` (in `src/navigation.ts`)
- Calls `router.replace(pathname, { locale: newLocale })` — locale-aware, no manual URL slicing

### tsParticles v3 API
- `init` prop was removed in v3
- Uses `initParticlesEngine(engine => loadSlim(engine))` in `useEffect`, renders `<Particles>` only after init

### Root layout
- `src/app/layout.tsx` must have `<html><body>` (Next.js requirement)
- `src/app/[locale]/layout.tsx` overrides with `<html lang={locale}>` and injects fonts, Navbar, Footer

### SEO
- `generateMetadata` per page per locale
- OG tags, Twitter card, hreflang alternates
- `src/lib/seo.ts` — `SITE_URL`, `OG_IMAGE`, `buildCanonical`, `buildAlternates`
- Schema.org `LocalBusiness` JSON-LD in locale layout
- `public/robots.txt` + dynamic `src/app/sitemap.ts`

---

## Clients / References

- **TrustBar:** Tyre Center, Ab Seamex Oy, V-Lift
- **Testimonials:** V-Lift, Ab Seamex Oy

---

## Calendly
All CTAs link to: `https://calendly.com/optelyofficial/15min`

---

## Logo
`/public/logo.webp` — used in Navbar and Footer via `next/image`

---

## Dev

```bash
cd /Users/eriksnellman/optely-website
npm run dev        # http://localhost:3000
npm run build      # production build check
```
