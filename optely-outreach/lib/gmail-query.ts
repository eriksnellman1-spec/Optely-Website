/** Allmänna e-posttjänster – här söker vi på hela adressen, inte domänen (samma lista som norm_domain i SQL). */
const FREE_DOMAINS = new Set([
  "gmail.com", "hotmail.com", "outlook.com", "live.com", "icloud.com", "me.com", "msn.com", "yahoo.com",
  "luukku.com", "kolumbus.fi", "netti.fi", "suomi24.fi", "pp.inet.fi", "elisanet.fi", "anvia.fi", "multi.fi", "gmail.fi",
]);

const EMAIL = /^[^\s@"(){}]+@([a-z0-9.-]+\.[a-z]{2,})$/i;

/** Söktermer för partnerna: domän för företagsadresser, hela adressen för gmail.com m.fl. */
export function partnerTerms(emails: (string | null)[]): string[] {
  const terms = new Set<string>();
  for (const raw of emails) {
    const email = raw?.trim().toLowerCase();
    const m = email?.match(EMAIL);
    if (!email || !m) continue;
    terms.add(FREE_DOMAINS.has(m[1]) ? email : m[1]);
  }
  return [...terms].sort();
}

/** Så många partner per sökning – Gmail klarar inte hur långa sökningar som helst. */
const CHUNK = 20;

/**
 * Gmail-sökningar som bara träffar mejl till/från partner, efter en tidpunkt. Delas i bitar om 20 partner.
 * Utan partner returneras en sökning som inte träffar något (annars skulle Gmail ge alla mejl).
 */
export function gmailQueries(terms: string[], after: Date) {
  const since = `after:${Math.floor(after.getTime() / 1000)}`;
  if (terms.length === 0) {
    const none = "from:ingen-partner@optely.invalid";
    return { sent: [`in:sent ${none}`], inbox: [`in:inbox ${none}`], partners: 0 };
  }
  const chunks: string[][] = [];
  for (let i = 0; i < terms.length; i += CHUNK) chunks.push(terms.slice(i, i + CHUNK));
  return {
    sent: chunks.map((c) => `in:sent {${c.flatMap((t) => [`to:${t}`, `cc:${t}`]).join(" ")}} ${since}`),
    inbox: chunks.map((c) => `in:inbox {${c.map((t) => `from:${t}`).join(" ")}} ${since}`),
    partners: terms.length,
  };
}
