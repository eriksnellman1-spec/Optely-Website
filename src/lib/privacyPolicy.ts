// Privacy policy text for /privacy. Describes the data the site actually collects:
// the contact form (sent by email via Resend), the booking chatbot (Anthropic + Google
// Calendar), Calendly links and hosting on Vercel. Update when data handling changes.

import type { Locale } from "@/lib/servicePages";

export const PRIVACY_UPDATED = "2026-10-27";

export const privacyPolicy: Record<
  Locale,
  { title: string; metaDescription: string; updated: string; sections: { title: string; text: string[] }[] }
> = {
  sv: {
    title: "Integritetspolicy",
    metaDescription: "Hur Optely behandlar personuppgifter på optely.eu: kontaktformulär, chattbot och mötesbokning.",
    updated: "Senast uppdaterad",
    sections: [
      {
        title: "Personuppgiftsansvarig",
        text: [
          "Optely, Erik Snellman, Jakobstad, Finland. E-post: erik@optely.eu, telefon: +358 44 971 8103.",
        ],
      },
      {
        title: "Vilka uppgifter vi samlar in och varför",
        text: [
          "Kontaktformuläret: namn, e-post, telefonnummer, företag och ditt meddelande. Uppgifterna skickas till oss via e-post så att vi kan svara dig.",
          "Chattboten: det du skriver i chatten används för att svara på dina frågor. Om du bokar ett möte används ditt namn, din e-post och eventuellt företag, telefonnummer och ämne för att skapa mötet i vår kalender och skicka en kalenderinbjudan till dig.",
          "Mötesbokning via Calendly: om du bokar via vår Calendly-länk behandlar Calendly uppgifterna enligt sin egen integritetspolicy.",
          "Den rättsliga grunden är ditt samtycke och vårt berättigade intresse av att svara på förfrågningar och boka möten som du själv begär.",
        ],
      },
      {
        title: "Tjänsteleverantörer",
        text: [
          "Vi använder följande leverantörer för att driva webbplatsen: Vercel (drift av webbplatsen), Resend (e-post från kontaktformuläret), Anthropic (AI-modellen som genererar chattbotens svar), Google (kalender och Google Meet för bokade möten) och Calendly (mötesbokning via länk). Vissa av dem kan behandla uppgifter utanför EU/EES, med skydd enligt EU:s standardavtalsklausuler eller motsvarande.",
        ],
      },
      {
        title: "Hur länge vi sparar uppgifterna",
        text: [
          "Meddelanden från kontaktformuläret och bokade möten sparas så länge det behövs för att hantera din förfrågan och vårt eventuella samarbete. Chattens historik sparas bara i din webbläsare under besöket och raderas när du stänger fliken; vi sparar inte konversationerna i någon egen databas.",
        ],
      },
      {
        title: "Kakor",
        text: [
          "Webbplatsen använder inga spårnings- eller marknadsföringskakor. Chatten använder webbläsarens sessionslagring för att komma ihåg konversationen medan fliken är öppen.",
        ],
      },
      {
        title: "Dina rättigheter",
        text: [
          "Du har rätt att begära tillgång till, rättelse eller radering av dina uppgifter, att invända mot behandlingen och att återkalla ditt samtycke. Kontakta oss på erik@optely.eu. Du kan också lämna klagomål till Dataombudsmannens byrå (tietosuoja.fi).",
        ],
      },
    ],
  },
  fi: {
    title: "Tietosuojaseloste",
    metaDescription: "Miten Optely käsittelee henkilötietoja sivustolla optely.eu: yhteydenottolomake, chatbot ja tapaamisvaraukset.",
    updated: "Päivitetty viimeksi",
    sections: [
      {
        title: "Rekisterinpitäjä",
        text: ["Optely, Erik Snellman, Pietarsaari, Suomi. Sähköposti: erik@optely.eu, puhelin: +358 44 971 8103."],
      },
      {
        title: "Mitä tietoja keräämme ja miksi",
        text: [
          "Yhteydenottolomake: nimi, sähköposti, puhelinnumero, yritys ja viestisi. Tiedot lähetetään meille sähköpostilla, jotta voimme vastata sinulle.",
          "Chatbot: chattiin kirjoittamaasi tekstiä käytetään kysymyksiisi vastaamiseen. Jos varaat tapaamisen, nimeäsi, sähköpostiasi sekä mahdollista yritystä, puhelinnumeroa ja aihetta käytetään tapaamisen luomiseen kalenteriimme ja kalenterikutsun lähettämiseen sinulle.",
          "Tapaamisvaraus Calendlyn kautta: jos varaat Calendly-linkkimme kautta, Calendly käsittelee tiedot oman tietosuojakäytäntönsä mukaisesti.",
          "Käsittelyn oikeusperuste on suostumuksesi ja oikeutettu etumme vastata yhteydenottoihin ja varata pyytämäsi tapaamiset.",
        ],
      },
      {
        title: "Palveluntarjoajat",
        text: [
          "Käytämme sivuston ylläpitoon seuraavia palveluntarjoajia: Vercel (sivuston ylläpito), Resend (yhteydenottolomakkeen sähköpostit), Anthropic (chatbotin vastauksia tuottava tekoälymalli), Google (kalenteri ja Google Meet varatuille tapaamisille) ja Calendly (tapaamisvaraus linkin kautta). Osa niistä voi käsitellä tietoja EU/ETA-alueen ulkopuolella EU:n vakiosopimuslausekkeiden tai vastaavien suojatoimien mukaisesti.",
        ],
      },
      {
        title: "Säilytysaika",
        text: [
          "Yhteydenottolomakkeen viestejä ja varattuja tapaamisia säilytetään niin kauan kuin se on tarpeen pyyntösi ja mahdollisen yhteistyömme hoitamiseksi. Chatin historia säilyy vain selaimessasi vierailun ajan ja poistuu, kun suljet välilehden; emme tallenna keskusteluja omaan tietokantaan.",
        ],
      },
      {
        title: "Evästeet",
        text: [
          "Sivusto ei käytä seuranta- tai markkinointievästeitä. Chat käyttää selaimen istuntotallennusta muistaakseen keskustelun, kun välilehti on auki.",
        ],
      },
      {
        title: "Oikeutesi",
        text: [
          "Sinulla on oikeus pyytää pääsyä tietoihisi, niiden oikaisemista tai poistamista, vastustaa käsittelyä ja peruuttaa suostumuksesi. Ota yhteyttä osoitteeseen erik@optely.eu. Voit myös tehdä valituksen tietosuojavaltuutetun toimistolle (tietosuoja.fi).",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    metaDescription: "How Optely processes personal data on optely.eu: contact form, chatbot and meeting booking.",
    updated: "Last updated",
    sections: [
      {
        title: "Data controller",
        text: ["Optely, Erik Snellman, Jakobstad, Finland. Email: erik@optely.eu, phone: +358 44 971 8103."],
      },
      {
        title: "What we collect and why",
        text: [
          "Contact form: name, email, phone number, company and your message. The details are sent to us by email so that we can reply to you.",
          "Chatbot: what you write in the chat is used to answer your questions. If you book a meeting, your name, email and any company, phone number and topic you give are used to create the meeting in our calendar and send you a calendar invitation.",
          "Booking via Calendly: if you book through our Calendly link, Calendly processes the data under its own privacy policy.",
          "The legal basis is your consent and our legitimate interest in answering enquiries and booking meetings you ask for.",
        ],
      },
      {
        title: "Service providers",
        text: [
          "We use these providers to run the website: Vercel (website hosting), Resend (email from the contact form), Anthropic (the AI model that generates the chatbot's answers), Google (calendar and Google Meet for booked meetings) and Calendly (booking via link). Some of them may process data outside the EU/EEA, protected by the EU Standard Contractual Clauses or equivalent safeguards.",
        ],
      },
      {
        title: "How long we keep data",
        text: [
          "Contact form messages and booked meetings are kept for as long as needed to handle your enquiry and any collaboration. Chat history is only kept in your browser during the visit and is deleted when you close the tab; we don't store conversations in a database of our own.",
        ],
      },
      {
        title: "Cookies",
        text: [
          "The website uses no tracking or marketing cookies. The chat uses the browser's session storage to remember the conversation while the tab is open.",
        ],
      },
      {
        title: "Your rights",
        text: [
          "You have the right to request access to, correction or deletion of your data, to object to the processing and to withdraw your consent. Contact us at erik@optely.eu. You can also lodge a complaint with the Office of the Data Protection Ombudsman in Finland (tietosuoja.fi).",
        ],
      },
    ],
  },
};
