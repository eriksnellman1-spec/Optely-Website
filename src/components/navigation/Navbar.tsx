"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/navigation";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";

export default function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const prefix = locale === "sv" ? "" : `/${locale}`;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `${prefix}/services`, label: t("services") },
    { href: `${prefix}/about`, label: t("about") },
    { href: `${prefix}/contact`, label: t("contact") },
  ];

  const pageLinks = [
    { href: prefix || "/", label: t("home") },
    { href: `${prefix}/services`, label: t("services") },
    { href: `${prefix}/about`, label: t("about") },
    { href: `${prefix}/process`, label: t("process") },
    { href: `${prefix}/contact`, label: t("contact") },
  ];

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "border-b border-white/[0.06]" : ""
      }`}
      style={{ background: "rgba(9,9,11,0.85)", backdropFilter: "blur(12px)" }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href={prefix || "/"} className="flex items-center" aria-label="Optely">
          <Image
            src="/logo.webp"
            alt="Optely"
            width={40}
            height={40}
            className="rounded-lg"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-dm text-sm text-muted transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div className="hidden items-center gap-4 md:flex">
          <label htmlFor="page-select" className="sr-only">
            {t("nav_select")}
          </label>
          <select
            id="page-select"
            value={pathname}
            onChange={(event) => router.push(event.target.value)}
            className="rounded-full border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none transition duration-200 hover:border-white/20"
          >
            {pageLinks.map((link) => (
              <option key={link.href} value={link.href}>
                {link.label}
              </option>
            ))}
          </select>
          <LanguageSwitcher />
          <a
            href="https://calendly.com/optelyofficial/15min"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-5 py-2 font-dm text-sm font-medium text-white transition-all duration-200 hover:bg-accent/90 hover:shadow-glow-blue"
          >
            {t("cta")}
          </a>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-3 md:hidden">
          <LanguageSwitcher />
          <button
            className="text-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="border-t border-white/[0.06] px-6 pb-6 pt-4 md:hidden"
          style={{ background: "rgba(9,9,11,0.97)" }}
        >
          <ul className="flex flex-col gap-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-dm text-base text-muted transition-colors hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <label htmlFor="mobile-page-select" className="sr-only">
              {t("nav_select")}
            </label>
            <select
              id="mobile-page-select"
              value={pathname}
              onChange={(event) => {
                router.push(event.target.value);
                setMobileOpen(false);
              }}
              className="w-full rounded-full border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none transition duration-200 hover:border-white/20"
            >
              {pageLinks.map((link) => (
                <option key={link.href} value={link.href}>
                  {link.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-6 flex flex-col gap-4">
            <a
              href="https://calendly.com/optelyofficial/15min"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-accent px-5 py-3 text-center font-dm text-sm font-medium text-white"
              onClick={() => setMobileOpen(false)}
            >
              {t("cta")}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
