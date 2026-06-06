import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>No organization found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            This installation does not allow public account creation. Sign in with a
            provisioned account or seed the local environment with the demo user.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
