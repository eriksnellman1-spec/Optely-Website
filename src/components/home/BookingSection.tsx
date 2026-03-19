"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function BookingSection() {
  const t = useTranslations("booking");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", phone: "", company: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-bg/60 px-4 py-3 font-dm text-sm text-white placeholder-muted outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent/30";

  return (
    <section id="contact" className="bg-bg py-24 px-6">
      <div className="mx-auto max-w-7xl">
        {/* CTA block */}
        <ScrollReveal>
          <div className="mb-16 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5 p-12 text-center">
            <Calendar className="mx-auto mb-4 text-accent" size={32} />
            <h2 className="mb-4 font-syne text-4xl font-bold text-white md:text-5xl">
              {t("title")}
            </h2>
            <p className="mb-8 font-dm text-lg text-muted">{t("sub")}</p>
            <a
              href="https://calendly.com/optelyofficial/15min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-accent px-10 py-4 font-dm text-base font-semibold text-white shadow-glow-blue transition-all hover:bg-accent/90 hover:shadow-glow-blue-lg"
            >
              {t("cta")}
            </a>
          </div>
        </ScrollReveal>

        {/* Contact form */}
        <ScrollReveal delay={0.1}>
          <div className="mx-auto max-w-2xl">
            <h3 className="mb-8 text-center font-syne text-2xl font-bold text-white">
              {t("form_title")}
            </h3>

            {status === "success" ? (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-8 text-center font-dm text-success">
                {t("success")}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder={t("name")}
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="email"
                    placeholder={t("email")}
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="tel"
                    placeholder={t("phone")}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder={t("company")}
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <textarea
                  placeholder={t("message")}
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
                {status === "error" && (
                  <p className="font-dm text-sm text-red-400">{t("error")}</p>
                )}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-full bg-accent py-4 font-dm text-sm font-semibold text-white transition-all hover:bg-accent/90 hover:shadow-glow-blue disabled:opacity-50"
                >
                  {status === "loading" ? "..." : t("submit")}
                </button>
              </form>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
