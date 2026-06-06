import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { syncStripeCheckoutSession } from "@/lib/stripe";

export default async function StripeCheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { session_id: sessionId } = await searchParams;

  if (sessionId) {
    await syncStripeCheckoutSession(sessionId).catch(() => null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_30%)] p-6">
      <div className="flex w-full max-w-xl flex-col items-center gap-6">
        <NeolyticsBrand />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Subscription confirmed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Your checkout finished successfully. Neolytics is syncing the organization plan now, and in most cases it
              is already active by the time you land here.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings">Open settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
