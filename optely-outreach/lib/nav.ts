import {
  Brain,
  Building2,
  Handshake,
  Home,
  LineChart,
  Phone,
  Send,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Bokstav efter `g`, t.ex. "h" → g h */
  key: string;
  description: string;
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Hem", icon: Home, key: "h", description: "War Room – dagens läge", mobile: true },
  { href: "/ringpass", label: "Ringpass", icon: Phone, key: "r", description: "Varma samtal att ringa", mobile: true },
  { href: "/outreach", label: "Outreach", icon: Send, key: "o", description: "AI Gatekeeper och kampanjer", mobile: true },
  { href: "/contacts", label: "Kontakter", icon: Building2, key: "k", description: "Bolag och kontakter", mobile: true },
  { href: "/partners", label: "Partners", icon: Handshake, key: "p", description: "Partnernätverket" },
  { href: "/strategy", label: "Strategy", icon: LineChart, key: "s", description: "KPI:er och veckorapport" },
  { href: "/brain", label: "Företagshjärnan", icon: Brain, key: "b", description: "Kontext som matar AI-texterna" },
  { href: "/settings", label: "Inställningar", icon: Settings, key: "i", description: "Veckoplan, utskick och konto" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
