import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

/** Platshållare för vyer som byggs i kommande steg. */
export function PlannedView({
  title,
  subtitle,
  icon,
  emptyTitle,
  emptyText,
  features,
  step,
  actions,
  headerActions,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyText: React.ReactNode;
  features: string[];
  step: number;
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={subtitle} actions={headerActions} />
      <EmptyState icon={icon} title={emptyTitle} description={emptyText} action={actions}>
        <div className="mt-5 flex flex-col items-center gap-3">
          <Badge variant="outline">Byggs i steg {step}</Badge>
          <ul className="space-y-1 text-left text-xs text-muted-foreground">
            {features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-subtle">–</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </EmptyState>
    </div>
  );
}
