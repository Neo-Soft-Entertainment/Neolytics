import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <Card className="animate-rise-in overflow-hidden border-white/10 bg-white/72 dark:bg-white/[0.03]">
      <div className="pointer-events-none h-px w-full shimmer-divider opacity-70" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-r from-foreground via-cyan-700 to-sky-500 bg-clip-text text-3xl font-bold tracking-[-0.04em] text-transparent dark:from-white dark:via-cyan-200 dark:to-sky-400">
          {value}
        </div>
        {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
