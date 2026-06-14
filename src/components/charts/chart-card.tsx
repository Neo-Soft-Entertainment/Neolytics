import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, children }: ChartCardProps) {
    let resolvedValue0: any;
  if (description) {
    resolvedValue0 = <CardDescription>{description}</CardDescription>;
  } else {
    resolvedValue0 = null;
  }
return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {resolvedValue0}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
