// Dedicated landing pages per service, one URL slug per locale so each page can target
// the words people search for in that language. Generic answers (price, data security, …)
// come from the shared "faq" messages via `sharedFaq`.

export type Locale = "sv" | "fi" | "en";

export interface ServicePageContent {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: { title: string; items?: string[]; text?: string }[];
  faq: { q: string; a: string }[];
}

export interface ServicePage {
  id: "training" | "consulting" | "chatbot" | "automation";
  serviceType: string;
  sharedFaq: number[];
  caseStudyId?: string;
  content: Record<Locale, ServicePageContent>;
}

export const servicePages: ServicePage[] = [
  {
    id: "training",
    serviceType: "AI training",
    sharedFaq: [2],
    content: {
      sv: {
        slug: "ai-utbildning",
        metaTitle: "AI-utbildning och AI-kurs för företag | Optely – Jakobstad, Finland",
        metaDescription:
          "Skräddarsydd AI-utbildning och AI-kurs för personal, chefer och hela företag: strategi, praktisk tillämpning och utbildning. Begär en offert från Optely.",
        h1: "AI-utbildning för företag",
        intro:
          "Vi hjälper er organisation att förstå AI och använda det i det dagliga arbetet. Vår AI-utbildning – eller AI-kurs – bygger på en skräddarsydd plan och omfattar strategi, tillämpning och utbildning – för personal, chefer eller hela företaget.",
        sections: [
          {
            title: "Vad utbildningen tar upp",
            items: [
              "Strategi – hur AI kan användas i just er verksamhet",
              "Tillämpning – AI-verktyg i det dagliga arbetet",
              "Utbildning – att bygga upp kunskap om AI i hela organisationen",
            ],
          },
          {
            title: "För vem",
            items: [
              "Personal som vill arbeta smartare med AI",
              "Chefer och ledning som vill ta fram en AI-strategi",
              "Hela företag som vill komma igång med AI tillsammans",
            ],
          },
          {
            title: "Upplägg",
            text: "Ingen utbildning är den andra lik. Vi tar fram en skräddarsydd plan utifrån era mål och behov.",
          },
        ],
        faq: [
          {
            q: "Vad kostar en AI-utbildning?",
            a: "Priset beror på upplägget. Kontakta oss så tar vi fram en offert.",
          },
          {
            q: "Kan utbildningen anpassas efter oss?",
            a: "Ja. Varje utbildning bygger på en skräddarsydd plan för er organisation.",
          },
          {
            q: "Vem kan delta?",
            a: "Utbildningen passar personal, chefer och ledning – eller hela företaget på en gång.",
          },
        ],
      },
      fi: {
        slug: "tekoalykoulutus",
        metaTitle: "Tekoälykoulutus yrityksille | Optely – Pietarsaari, Suomi",
        metaDescription:
          "Räätälöity tekoälykoulutus henkilöstölle, esihenkilöille ja koko yritykselle: strategia, käytännön soveltaminen ja koulutus. Pyydä tarjous Optelylta.",
        h1: "Tekoälykoulutus yrityksille",
        intro:
          "Autamme organisaatiotasi ymmärtämään tekoälyä ja hyödyntämään sitä päivittäisessä työssä. Tekoälykoulutus rakentuu räätälöidyn suunnitelman pohjalle ja kattaa strategian, soveltamisen ja koulutuksen – henkilöstölle, esihenkilöille tai koko yritykselle.",
        sections: [
          {
            title: "Mitä koulutus sisältää",
            items: [
              "Strategia – miten tekoälyä voi hyödyntää juuri teidän liiketoiminnassanne",
              "Soveltaminen – tekoälytyökalut osaksi päivittäistä työtä",
              "Koulutus – tekoälyosaamisen kasvattaminen koko organisaatiossa",
            ],
          },
          {
            title: "Kenelle",
            items: [
              "Henkilöstölle, joka haluaa työskennellä älykkäämmin tekoälyn avulla",
              "Esihenkilöille ja johdolle, jotka haluavat laatia tekoälystrategian",
              "Koko yritykselle, joka haluaa aloittaa tekoälyn käytön yhdessä",
            ],
          },
          {
            title: "Toteutus",
            text: "Jokainen koulutus on erilainen. Laadimme räätälöidyn suunnitelman tavoitteidenne ja tarpeidenne mukaan.",
          },
        ],
        faq: [
          {
            q: "Paljonko tekoälykoulutus maksaa?",
            a: "Hinta riippuu koulutuksen sisällöstä ja laajuudesta. Ota yhteyttä, niin laadimme tarjouksen.",
          },
          {
            q: "Voiko koulutuksen räätälöidä meille?",
            a: "Kyllä. Jokainen koulutus perustuu organisaatiollenne laadittuun suunnitelmaan.",
          },
          {
            q: "Kenelle koulutus sopii?",
            a: "Koulutus sopii henkilöstölle, esihenkilöille ja johdolle – tai koko yritykselle kerralla.",
          },
        ],
      },
      en: {
        slug: "ai-training",
        metaTitle: "AI Training for Businesses | Optely – Jakobstad, Finland",
        metaDescription:
          "Tailored AI training for staff, managers and whole companies: strategy, practical application and training. Request a quote from Optely.",
        h1: "AI training for businesses",
        intro:
          "We help your organisation understand AI and use it in everyday work. The training is built on a tailored plan and covers strategy, application and training – for staff, managers or the whole company.",
        sections: [
          {
            title: "What the training covers",
            items: [
              "Strategy – how AI can be used in your particular business",
              "Application – AI tools in everyday work",
              "Training – building AI knowledge across the organisation",
            ],
          },
          {
            title: "Who it's for",
            items: [
              "Staff who want to work smarter with AI",
              "Managers and leadership who want an AI strategy",
              "Whole companies that want to get started with AI together",
            ],
          },
          {
            title: "How it works",
            text: "No two trainings are the same. We put together a tailored plan based on your goals and needs.",
          },
        ],
        faq: [
          {
            q: "What does AI training cost?",
            a: "The price depends on the content and scope. Get in touch and we'll prepare a quote.",
          },
          {
            q: "Can the training be tailored to us?",
            a: "Yes. Every training is based on a plan made for your organisation.",
          },
          {
            q: "Who can take part?",
            a: "The training suits staff, managers and leadership – or the whole company at once.",
          },
        ],
      },
    },
  },
  {
    id: "consulting",
    serviceType: "AI consulting",
    sharedFaq: [3, 2, 1],
    content: {
      sv: {
        slug: "ai-konsult",
        metaTitle: "AI-konsult för företag | Optely – Jakobstad, Finland",
        metaDescription:
          "Optely är AI-konsulten som kartlägger var AI gör mest nytta i ditt företag, tar fram en tydlig plan och hjälper er hela vägen till en färdig lösning.",
        h1: "AI-konsult för företag",
        intro:
          "Som AI-konsult hjälper vi ert företag med analys, rekommendation och implementering. Vi kartlägger era AI-möjligheter, tar fram en tydlig handlingsplan och hjälper er sedan hela vägen till en färdig lösning.",
        sections: [
          {
            title: "Vad vi hjälper till med",
            items: [
              "Vi hittar var AI gör mest nytta",
              "Beräkning av vad ni sparar",
              "Tydlig plan steg för steg",
              "Hjälp att välja rätt verktyg",
            ],
          },
          {
            title: "Så arbetar vi",
            items: [
              "Insikt & strategi – vi förstår er verksamhet, kartlägger AI-möjligheterna och tar fram en plan anpassad efter era mål",
              "Implementering – vi bygger och inför AI-lösningar anpassade efter er organisation",
              "Partnerskap – vi följer upp, optimerar och vidareutvecklar i takt med verksamheten",
            ],
          },
        ],
        faq: [],
      },
      fi: {
        slug: "tekoalykonsultointi",
        metaTitle: "Tekoälykonsultointi yrityksille | Optely – Pietarsaari, Suomi",
        metaDescription:
          "Optely on tekoälykonsultti, joka kartoittaa, missä tekoäly hyödyttää yritystäsi eniten, laatii selkeän suunnitelman ja vie ratkaisun valmiiksi asti.",
        h1: "Tekoälykonsultointi yrityksille",
        intro:
          "Tekoälykonsulttina autamme yritystäsi analyysissa, suosituksissa ja käyttöönotossa. Kartoitamme tekoälyn mahdollisuudet, laadimme selkeän toimintasuunnitelman ja viemme ratkaisun valmiiksi asti.",
        sections: [
          {
            title: "Missä autamme",
            items: [
              "Löydämme, missä tekoäly hyödyttää eniten",
              "Laskelma siitä, mitä säästätte",
              "Selkeä suunnitelma askel askeleelta",
              "Apu oikeiden työkalujen valintaan",
            ],
          },
          {
            title: "Näin työskentelemme",
            items: [
              "Näkemys & strategia – ymmärrämme liiketoimintanne, kartoitamme tekoälyn mahdollisuudet ja laadimme tavoitteidenne mukaisen suunnitelman",
              "Käyttöönotto – rakennamme ja otamme käyttöön organisaatiollenne räätälöidyt AI-ratkaisut",
              "Kumppanuus – seuraamme, optimoimme ja kehitämme ratkaisuja liiketoimintanne tahdissa",
            ],
          },
        ],
        faq: [],
      },
      en: {
        slug: "ai-consulting",
        metaTitle: "AI Consulting for Businesses | Optely – Jakobstad, Finland",
        metaDescription:
          "Optely is the AI consultant that maps where AI helps your business most, builds a clear plan and takes you all the way to a finished solution.",
        h1: "AI consulting for businesses",
        intro:
          "As your AI consultant we help with analysis, recommendation and implementation. We map your AI opportunities, develop a clear action plan and take you all the way to a finished solution.",
        sections: [
          {
            title: "What we help with",
            items: [
              "We find where AI helps the most",
              "A calculation of what you save",
              "A clear step-by-step plan",
              "Help choosing the right tools",
            ],
          },
          {
            title: "How we work",
            items: [
              "Insight & strategy – we understand your business, map AI opportunities and develop a plan tailored to your goals",
              "Implementation – we build and roll out AI solutions tailored to your organisation",
              "Partnership – we follow up, optimise and develop further in line with your business",
            ],
          },
        ],
        faq: [],
      },
    },
  },
  {
    id: "chatbot",
    serviceType: "AI chatbot and customer service",
    sharedFaq: [3, 2, 1],
    content: {
      sv: {
        slug: "chatbot-for-foretag",
        metaTitle: "Chatbot för företag – AI-kundservice | Optely",
        metaDescription:
          "En AI-chatbot (chattbot) som svarar era kunder dygnet runt på webben, i e-post och sociala medier – och lämnar över till en människa vid behov.",
        h1: "Chatbot för företag",
        intro:
          "Med en AI-chatbot får era kunder svar dygnet runt – snabbt och utan övertid. Vi bygger AI-assistenter som svarar på och sorterar förfrågningar, och som lämnar över till en människa när det behövs.",
        sections: [
          {
            title: "Vad chatboten gör",
            items: [
              "Kundservice dygnet runt",
              "Svarar på och sorterar förfrågningar",
              "Fungerar på webben, e-post och sociala medier",
              "Lämnar över till en människa vid behov",
            ],
          },
        ],
        faq: [],
      },
      fi: {
        slug: "chatbot-yritykselle",
        metaTitle: "Chatbot yritykselle – AI-asiakaspalvelu | Optely",
        metaDescription:
          "Tekoälychatbot, joka vastaa asiakkaillenne ympäri vuorokauden verkkosivuilla, sähköpostissa ja somessa – ja siirtää keskustelun ihmiselle tarvittaessa.",
        h1: "Chatbot yritykselle",
        intro:
          "Tekoälychatbotin avulla asiakkaanne saavat vastauksen ympäri vuorokauden – nopeasti ja ilman ylitöitä. Rakennamme AI-avustajia, jotka vastaavat ja lajittelevat yhteydenotot ja siirtävät keskustelun ihmiselle tarvittaessa.",
        sections: [
          {
            title: "Mitä chatbot tekee",
            items: [
              "Asiakaspalvelu ympäri vuorokauden",
              "Vastaa ja lajittelee yhteydenotot",
              "Toimii verkkosivuilla, sähköpostissa ja somessa",
              "Siirtää ihmiselle tarvittaessa",
            ],
          },
        ],
        faq: [],
      },
      en: {
        slug: "chatbot-for-business",
        metaTitle: "Chatbot for Business – AI Customer Service | Optely",
        metaDescription:
          "An AI chatbot that answers your customers around the clock on your website, email and social media – and hands over to a person when needed.",
        h1: "Chatbot for business",
        intro:
          "With an AI chatbot your customers get answers around the clock – fast and without overtime. We build AI assistants that answer and sort enquiries and hand over to a person when needed.",
        sections: [
          {
            title: "What the chatbot does",
            items: [
              "Customer service around the clock",
              "Answers and sorts enquiries",
              "Works on your website, email and social media",
              "Hands over to a person when needed",
            ],
          },
        ],
        faq: [],
      },
    },
  },
  {
    id: "automation",
    serviceType: "AI automation",
    caseStudyId: "boat-dealer-margin",
    sharedFaq: [1, 3, 2],
    content: {
      sv: {
        slug: "ai-automation",
        metaTitle: "AI-automation för företag | Optely – Jakobstad, Finland",
        metaDescription:
          "Låt AI sköta de återkommande arbetsuppgifterna. Optely automatiserar processer och e-post och kopplar ihop programmen ni redan använder.",
        h1: "AI-automation för företag",
        intro:
          "Låt AI sköta de återkommande uppgifterna. Mindre manuellt arbete och mer tid för det som verkligen skapar värde. Vi automatiserar processer och e-post och anpassar lösningen efter hur ni arbetar.",
        sections: [
          {
            title: "Vad vi automatiserar",
            items: [
              "Återkommande arbetsuppgifter",
              "Processer och e-post",
              "Kopplingar mellan program ni redan använder",
              "Automatisk hantering av information",
            ],
          },
        ],
        faq: [],
      },
      fi: {
        slug: "ai-automaatio",
        metaTitle: "AI-automaatio yrityksille | Optely – Pietarsaari, Suomi",
        metaDescription:
          "Anna tekoälyn hoitaa toistuvat työtehtävät. Optely automatisoi prosessit ja sähköpostin ja yhdistää jo käyttämänne ohjelmat.",
        h1: "AI-automaatio yrityksille",
        intro:
          "Anna tekoälyn hoitaa toistuvat tehtävät. Vähemmän käsityötä ja enemmän aikaa sille, mikä todella luo arvoa. Automatisoimme prosessit ja sähköpostin ja räätälöimme ratkaisun teidän tapaanne työskennellä.",
        sections: [
          {
            title: "Mitä automatisoimme",
            items: [
              "Toistuvat työtehtävät",
              "Prosessit ja sähköposti",
              "Yhteydet jo käyttämienne ohjelmien välillä",
              "Tiedon automaattinen käsittely",
            ],
          },
        ],
        faq: [],
      },
      en: {
        slug: "ai-automation",
        metaTitle: "AI Automation for Businesses | Optely – Jakobstad, Finland",
        metaDescription:
          "Let AI handle the repetitive tasks. Optely automates processes and email and connects the programs you already use.",
        h1: "AI automation for businesses",
        intro:
          "Let AI handle the repetitive tasks. Less manual work and more time for what really creates value. We automate processes and email and adapt the solution to how you work.",
        sections: [
          {
            title: "What we automate",
            items: [
              "Repetitive tasks",
              "Processes and email",
              "Connections between programs you already use",
              "Automatic handling of information",
            ],
          },
        ],
        faq: [],
      },
    },
  },
];

export function findServicePage(locale: Locale, slug: string) {
  return servicePages.find((p) => p.content[locale].slug === slug);
}

// A slug from another language (e.g. after switching language on a service page)
export function findServicePageAnyLocale(slug: string) {
  return servicePages.find((p) =>
    (Object.keys(p.content) as Locale[]).some((l) => p.content[l].slug === slug)
  );
}

export function servicePagePath(locale: Locale, page: ServicePage) {
  const prefix = locale === "sv" ? "" : `/${locale}`;
  return `${prefix}/${page.content[locale].slug}`;
}
