import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardContent
        className={cn(
          "grid gap-5 border-l-4 border-l-primary/70 p-5 lg:items-start",
          summary ? "lg:grid-cols-[minmax(0,1fr)_300px]" : "lg:grid-cols-1"
        )}
      >
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
