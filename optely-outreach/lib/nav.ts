import {
  Brain,
  Building2,
  CalendarCheck,
  FileText,
  Handshake,
  Kanban,
  LayoutDashboard,
  Phone,
  Send,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Bokstav efter `g`, t.ex. "h" → g h */
  key: string;
  description: string;
  /** I mobilens bottenrad */
  mobile?: boolean;
  /** Under "Mer" i sidomenyn */
  more?: boolean;
  /** Visas bara för Optely (döljs när växeln står på SBA) */
  optelyOnly?: boolean;
};

/** Ordning enligt docs/saljsystem.md. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Översikt", icon: LayoutDashboard, key: "h", description: "Veckans siffror per erbjudande", mobile: true },
  { href: "/ringpass", label: "Idag", icon: Phone, key: "r", description: "Dagens samtal och uppföljningar", mobile: true },
  { href: "/contacts", label: "Företag", icon: Building2, key: "f", description: "Registret och kontaktkort", mobile: true },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, key: "p", description: "Kontaktad → Kund", mobile: true },
  { href: "/customers", label: "Kunder", icon: Users, key: "k", description: "Optely-projekt och SBA-garanti" },
  { href: "/scripts", label: "Manus och sekvenser", icon: FileText, key: "m", description: "Samtalsmanus, invändningar, e-post" },
  { href: "/partners", label: "Partner", icon: Handshake, key: "a", description: "Partnernätverket (Optely)", optelyOnly: true },
  { href: "/strategy", label: "Lördagsanalys", icon: CalendarCheck, key: "l", description: "Veckans siffror och vad som ska ändras" },
  { href: "/settings", label: "Inställningar", icon: Settings, key: "s", description: "Veckoplan, ringpass och logg" },
  { href: "/outreach", label: "Outreach", icon: Send, key: "o", description: "Mejl per status", more: true },
  { href: "/brain", label: "Företagshjärnan", icon: Brain, key: "b", description: "Profil, erbjudande, mallar", more: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
