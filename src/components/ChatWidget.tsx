"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { MessageCircle, X, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "optely-chat";
const CALENDLY = "https://calendly.com/optelyofficial/15min";

const text = {
  sv: {
    open: "Öppna chatten",
    close: "Stäng chatten",
    title: "Optely-assistenten",
    subtitle: "Svarar direkt och bokar möten",
    greeting:
      "Hej! Jag kan svara på frågor om Optely och boka ett kostnadsfritt 15 minuters möte med Erik direkt i kalendern. Vad undrar du?",
    placeholder: "Skriv ett meddelande…",
    send: "Skicka",
    notice: "Chatten använder AI. Vid bokning används ditt namn och din e-post för mötesinbjudan.",
    privacy: "Integritetspolicy",
    error: `Något gick fel. Försök igen, boka via ${CALENDLY} eller mejla erik@optely.eu.`,
    busy: "Många frågor just nu. Vänta en stund och försök igen.",
  },
  fi: {
    open: "Avaa chat",
    close: "Sulje chat",
    title: "Optelyn avustaja",
    subtitle: "Vastaa heti ja varaa tapaamisia",
    greeting:
      "Hei! Voin vastata kysymyksiin Optelysta ja varata maksuttoman 15 minuutin tapaamisen Erikin kanssa suoraan kalenteriin. Miten voin auttaa?",
    placeholder: "Kirjoita viesti…",
    send: "Lähetä",
    notice: "Chat käyttää tekoälyä. Varauksessa nimeäsi ja sähköpostiasi käytetään kokouskutsuun.",
    privacy: "Tietosuojaseloste",
    error: `Jotain meni pieleen. Yritä uudelleen, varaa ${CALENDLY} tai lähetä sähköpostia erik@optely.eu.`,
    busy: "Paljon kysymyksiä juuri nyt. Odota hetki ja yritä uudelleen.",
  },
  en: {
    open: "Open chat",
    close: "Close chat",
    title: "Optely assistant",
    subtitle: "Answers instantly and books meetings",
    greeting:
      "Hi! I can answer questions about Optely and book a free 15-minute meeting with Erik straight into his calendar. What would you like to know?",
    placeholder: "Write a message…",
    send: "Send",
    notice: "This chat uses AI. If you book, your name and email are used for the meeting invitation.",
    privacy: "Privacy policy",
    error: `Something went wrong. Try again, book at ${CALENDLY} or email erik@optely.eu.`,
    busy: "Lots of questions right now. Please wait a moment and try again.",
  },
};

// Plain text with clickable links; never renders HTML from the model
function Linkified({ value }: { value: string }) {
  const parts = value.split(/(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          const href = part.replace(/[.,!?]+$/, "");
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline">
              {part}
            </a>
          );
        }
        if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(part)) {
          return (
            <a key={i} href={`mailto:${part}`} className="underline">
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function ChatWidget() {
  const locale = useLocale() as keyof typeof text;
  const t = text[locale] ?? text.sv;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function send() {
    const content = input.trim().slice(0, 2000);
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        typeof data.reply === "string" && data.reply
          ? data.reply
          : res.status === 429 || data.error === "busy"
            ? t.busy
            : t.error;
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: t.error }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label={t.title}
          className="fixed bottom-24 right-4 z-[60] flex h-[min(560px,calc(100vh-8rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl sm:right-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <div className="font-syne text-sm font-bold text-white">{t.title}</div>
              <div className="font-dm text-xs text-muted">{t.subtitle}</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t.close} className="text-muted hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {[{ role: "assistant" as const, content: t.greeting }, ...messages].map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 font-dm text-sm leading-relaxed ${
                    m.role === "user" ? "bg-accent text-white" : "bg-white/[0.06] text-white/90"
                  }`}
                >
                  <Linkified value={m.content} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl bg-white/[0.06] px-3 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-white/10 p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder={t.placeholder}
                className="max-h-28 flex-1 resize-none rounded-xl border border-white/10 bg-bg px-3 py-2 font-dm text-sm text-white outline-none placeholder:text-muted focus:border-accent"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label={t.send}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white transition disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="mt-2 font-dm text-[11px] leading-snug text-muted">
              {t.notice}{" "}
              <a href={locale === "sv" ? "/privacy" : `/${locale}/privacy`} className="underline">
                {t.privacy}
              </a>
            </p>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t.close : t.open}
        className="fixed bottom-6 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-glow-blue transition hover:bg-accent/90 sm:right-6"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
