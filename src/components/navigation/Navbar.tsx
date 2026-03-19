"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";

export default function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const prefix = locale === "sv" ? "" : `/${locale}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `${prefix}/services`, label: t("services") },
    { href: `${prefix}/about`, label: t("about") },
    { href: `${prefix}/vvs`, label: t("vvs") },
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

        {/* Mobile hamburger */}
        <button
          className="text-muted md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
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
          <div className="mt-6 flex flex-col gap-4">
            <LanguageSwitcher />
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
