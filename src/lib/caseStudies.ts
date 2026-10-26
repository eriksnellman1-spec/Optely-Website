// Customer case studies. Text, customer name and quote are approved by the owner and
// the customer. Quotes are kept in the language they were given; other locales get a
// translation marked with `translated`.

import type { Locale } from "@/lib/servicePages";

export interface CaseStudyContent {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  quote?: { text: string; author: string; translated?: boolean };
  sections: { title: string; text?: string; items?: string[] }[];
}

export interface CaseStudy {
  id: string;
  content: Record<Locale, CaseStudyContent>;
}

export const caseStudyLabels: Record<Locale, { label: string; readMore: string }> = {
  sv: { label: "Kundcase", readMore: "Läs kundcaset" },
  fi: { label: "Asiakastarina", readMore: "Lue asiakastarina" },
  en: { label: "Case study", readMore: "Read the case study" },
};

export const caseStudies: CaseStudy[] = [
  {
    id: "boat-dealer-margin",
    content: {
      sv: {
        slug: "kundcase-automatisk-lonsamhetskalkyl",
        metaTitle: "Kundcase OD Center: Automatisk lönsamhetskalkyl för begagnade båtar | Optely",
        metaDescription:
          "Hur Optely automatiserade lönsamhetskalkylen för OD Center i Bosund: en n8n-automation kopplar kassasystemet Tehden till ett kalkylark.",
        h1: "OD Center: automatisk lönsamhetskalkyl för begagnade båtar och maskiner",
        intro:
          "OD Center (Ocean Dealers Ab Oy) i Bosund säljer båtar, motorer och fyrhjulingar och har omkring 710 begagnade produkter i sortimentet. Optely byggde en automation som räknar ut vad varje begagnad produkt har kostat och vad den lämnar i bidrag.",
        quote: {
          text: "Optely byggde en automation som kopplar vår Tehden-kassa till ett kalkylark och räknar ut värdeuppräkningen på våra begagnade produkter automatiskt. Det sparar oss manuellt arbete.",
          author: "Bertil, OD Center",
        },
        sections: [
          {
            title: "Utmaningen",
            text: "När en begagnad båt eller maskin servas eller får nya delar inför försäljning ökar dess värde. Men det värdet fanns inte samlat någonstans. Att räkna ut vad varje produkt egentligen kostat – inköpspris, arbete och delar – var ett manuellt jobb.",
          },
          {
            title: "Lösningen",
            text: "Vi byggde en automation i n8n som kopplar kassasystemet Tehden till ett kalkylark. Automationen:",
            items: [
              "hämtar de begagnade produkterna och deras inköpspris",
              "hittar arbete och delar för varje produkt via ordernumret och räknar ut det tillagda värdet – arbetet räknas med ett internt timpris",
              "visar allt i kalkylarket i två vyer som uppdateras automatiskt",
              "räknar ut bidraget per produkt: försäljningspris minus inköpspris, arbete och delar",
            ],
          },
          {
            title: "Resultatet",
            text: "OD Center ser nu direkt vad varje begagnad produkt har kostat och vad den lämnar i bidrag – utan att räkna för hand.",
          },
        ],
      },
      fi: {
        slug: "asiakastarina-automaattinen-kannattavuuslaskelma",
        metaTitle: "Asiakastarina OD Center: Automaattinen kannattavuuslaskelma käytetyille veneille | Optely",
        metaDescription:
          "Näin Optely automatisoi OD Centerin kannattavuuslaskelman: n8n-automaatio yhdistää Tehden-kassajärjestelmän laskentataulukkoon.",
        h1: "OD Center: automaattinen kannattavuuslaskelma käytetyille veneille ja koneille",
        intro:
          "Bosundissa toimiva OD Center (Ocean Dealers Ab Oy) myy veneitä, moottoreita ja mönkijöitä, ja valikoimassa on noin 710 käytettyä tuotetta. Optely rakensi automaation, joka laskee, mitä kukin käytetty tuote on maksanut ja paljonko se jättää katetta.",
        quote: {
          text: "Optely rakensi automaation, joka yhdistää Tehden-kassamme laskentataulukkoon ja laskee käytettyjen tuotteidemme arvonnousun automaattisesti. Se säästää meiltä käsityötä.",
          author: "Bertil, OD Center",
          translated: true,
        },
        sections: [
          {
            title: "Haaste",
            text: "Kun käytetty vene tai kone huolletaan tai siihen vaihdetaan osia ennen myyntiä, sen arvo nousee. Tätä arvoa ei kuitenkaan ollut koottu mihinkään. Sen laskeminen, mitä kukin tuote todellisuudessa maksoi – ostohinta, työ ja osat – oli käsityötä.",
          },
          {
            title: "Ratkaisu",
            text: "Rakensimme n8n-automaation, joka yhdistää Tehden-kassajärjestelmän laskentataulukkoon. Automaatio:",
            items: [
              "hakee käytetyt tuotteet ja niiden ostohinnat",
              "löytää kunkin tuotteen työt ja osat tilausnumeron perusteella ja laskee lisätyn arvon – työ lasketaan sisäisellä tuntihinnalla",
              "näyttää kaiken laskentataulukossa kahdessa näkymässä, jotka päivittyvät automaattisesti",
              "laskee tuotekohtaisen katteen: myyntihinta miinus ostohinta, työ ja osat",
            ],
          },
          {
            title: "Tulos",
            text: "OD Center näkee nyt suoraan, mitä kukin käytetty tuote on maksanut ja paljonko se jättää katetta – ilman käsin laskemista.",
          },
        ],
      },
      en: {
        slug: "case-study-automated-margin-calculation",
        metaTitle: "Case study OD Center: Automated margin calculation for used boats | Optely",
        metaDescription:
          "How Optely automated the margin calculation for OD Center in Bosund, Finland: an n8n automation connects the Tehden POS system to a spreadsheet.",
        h1: "OD Center: automated margin calculation for used boats and machines",
        intro:
          "OD Center (Ocean Dealers Ab Oy) in Bosund sells boats, engines and ATVs and has around 710 used products in stock. Optely built an automation that calculates what each used product has cost and the margin it leaves.",
        quote: {
          text: "Optely built an automation that connects our Tehden POS to a spreadsheet and automatically calculates the added value of our used products. It saves us manual work.",
          author: "Bertil, OD Center",
          translated: true,
        },
        sections: [
          {
            title: "The challenge",
            text: "When a used boat or machine is serviced or gets new parts before sale, its value increases. But that value wasn't collected anywhere. Working out what each product had really cost – purchase price, labour and parts – was manual work.",
          },
          {
            title: "The solution",
            text: "We built an n8n automation that connects the Tehden POS system to a spreadsheet. The automation:",
            items: [
              "fetches the used products and their purchase prices",
              "finds labour and parts for each product via the order number and calculates the added value – labour is counted at an internal hourly rate",
              "shows everything in the spreadsheet in two views that update automatically",
              "calculates the margin per product: sales price minus purchase price, labour and parts",
            ],
          },
          {
            title: "The result",
            text: "OD Center now sees straight away what each used product has cost and the margin it leaves – without calculating by hand.",
          },
        ],
      },
    },
  },
];

export function findCaseStudy(locale: Locale, slug: string) {
  return caseStudies.find((c) => c.content[locale].slug === slug);
}

export function findCaseStudyAnyLocale(slug: string) {
  return caseStudies.find((c) =>
    (Object.keys(c.content) as Locale[]).some((l) => c.content[l].slug === slug)
  );
}

export function caseStudyPath(locale: Locale, study: CaseStudy) {
  const prefix = locale === "sv" ? "" : `/${locale}`;
  return `${prefix}/${study.content[locale].slug}`;
}
