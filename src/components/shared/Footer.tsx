import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Instagram, Facebook, Youtube } from "lucide-react";

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const prefix = locale === "sv" ? "" : `/${locale}`;

  const links = [
    { href: `${prefix}/services`, label: t("services") },
    { href: `${prefix}/about`, label: t("about") },
    { href: `${prefix}/vvs`, label: t("vvs") },
    { href: `${prefix}/contact`, label: t("contact") },
  ];

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <Image
                src="/logo.webp"
                alt="Optely"
                width={56}
                height={56}
                className="rounded-xl"
              />
            </div>
            <p className="font-dm text-sm text-muted">{t("tagline")}</p>
            <div className="mt-6 flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted transition-colors hover:text-accent"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted transition-colors hover:text-accent"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted transition-colors hover:text-accent"
                aria-label="YouTube"
              >
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
              {t("nav_heading")}
            </h3>
            <ul className="flex flex-col gap-3">
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
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
              {t("contact_heading")}
            </h3>
            <div className="flex flex-col gap-3 font-dm text-sm text-muted">
              <div>
                <div className="text-white">Erik Snellman</div>
                <a
                  href="mailto:eriksnellman1@gmail.com"
                  className="transition-colors hover:text-accent"
                >
                  eriksnellman1@gmail.com
                </a>
                <div>
                  <a href="tel:+358449718103" className="transition-colors hover:text-accent">
                    +358 44 971 8103
                  </a>
                </div>
              </div>
              <div>
                <div className="text-white">Joas Vikström</div>
                <a
                  href="mailto:joas.vikstrom@gmail.com"
                  className="transition-colors hover:text-accent"
                >
                  joas.vikstrom@gmail.com
                </a>
                <div>
                  <a href="tel:+358456160663" className="transition-colors hover:text-accent">
                    +358 45 616 0663
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="font-dm text-xs text-muted">
            © 2026 Optely. {t("rights")}
          </p>
          <p className="font-mono text-xs text-muted/60">
            {t("location")}
          </p>
        </div>
      </div>
    </footer>
  );
}
