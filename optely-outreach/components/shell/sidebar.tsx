"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

export function Sidebar({ openCallTasks }: { openCallTasks: number }) {
  const pathname = usePathname();
  const { sidebarCollapsed: collapsed, toggleSidebar, openDialog } = useShell();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 max-md:hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150 md:flex",
        collapsed ? "w-[52px]" : "w-[216px]",
      )}
    >
      <div className={cn("flex h-12 items-center gap-2 px-3", collapsed && "justify-center px-0")}>
        <LogoMark className="size-5 shrink-0" />
        {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">Optely O.R.</span>}
      </div>

      <div className={cn("px-2 pb-2", collapsed && "px-1.5")}>
        <SidebarButton
          collapsed={collapsed}
          label="Sök"
          icon={<Search />}
          hint={<Kbd keys={["⌘", "K"]} />}
          onClick={() => openDialog("palette")}
        />
      </div>

      <nav className={cn("flex flex-1 flex-col gap-0.5 px-2", collapsed && "px-1.5")} aria-label="Huvudmeny">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const badge = item.href === "/ringpass" && openCallTasks > 0 ? openCallTasks : null;

          const link = (
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active && "text-foreground")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {badge !== null &&
                (collapsed ? (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-brand" />
                ) : (
                  <span className="ml-auto rounded bg-brand/15 px-1.5 font-mono text-[11px] text-brand tabular-nums">
                    {badge}
                  </span>
                ))}
            </Link>
          );

          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                {item.label}
                {badge !== null && <span className="font-mono text-brand">{badge}</span>}
                <Kbd keys={["g", item.key]} />
              </TooltipContent>
            </Tooltip>
          ) : (
            <div key={item.href}>{link}</div>
          );
        })}
      </nav>

      <div className={cn("border-t border-border p-2", collapsed && "px-1.5")}>
        <SidebarButton
          collapsed={collapsed}
          label={collapsed ? "Fäll ut menyn" : "Fäll ihop"}
          icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          hint={<Kbd>[</Kbd>}
          onClick={toggleSidebar}
        />
      </div>
    </aside>
  );
}

function SidebarButton({
  collapsed,
  label,
  icon,
  hint,
  onClick,
}: {
  collapsed: boolean;
  label: string;
  icon: React.ReactNode;
  hint?: React.ReactNode;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        collapsed && "justify-center px-0",
      )}
    >
      {icon}
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {hint && <span className="ml-auto">{hint}</span>}
        </>
      )}
    </button>
  );

  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {label}
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
