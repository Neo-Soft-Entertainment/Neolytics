import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function PageHero({
  title,
  description,
  actions,
  summary
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_24px_60px_rgba(14,165,233,0.08)]">
      <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </div>
        {summary ? summary : null}
      </CardContent>
    </Card>
  );
}
