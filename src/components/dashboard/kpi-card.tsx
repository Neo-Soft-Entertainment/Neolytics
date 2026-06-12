import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <Card className="animate-rise-in overflow-hidden border-cyan-300/12 bg-white/78 shadow-[0_18px_48px_rgba(8,47,73,0.06)] dark:bg-white/[0.035]">
      <div className="pointer-events-none h-px w-full shimmer-divider opacity-70" />
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-r from-foreground via-cyan-700 to-blue-500 bg-clip-text text-2xl font-bold tracking-[-0.03em] text-transparent dark:from-white dark:via-cyan-200 dark:to-blue-300">
          {value}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
