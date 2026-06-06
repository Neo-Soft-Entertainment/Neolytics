import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <div className="container flex min-h-screen flex-col justify-center gap-8 py-12">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
            Steam-first market intelligence
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Find the right market before you build the wrong game.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Neolytics helps studios, publishers, and investors track Steam games,
              benchmark competitors, estimate revenue, and validate market opportunities.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={session ? "/dashboard" : "/login"}>
                {session ? "Open dashboard" : "Sign in"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
