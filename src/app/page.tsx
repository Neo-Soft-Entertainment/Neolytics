import Link from "next/link";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%)]">
      <div className="container space-y-12 py-12 lg:py-20">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div className="max-w-4xl space-y-6">
            <span className="inline-flex rounded-full border border-border bg-card/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur">
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
              <Button asChild size="lg" variant="outline">
                <Link href={session ? "/games" : "/login"}>
                  Explore games
                </Link>
              </Button>
            </div>
          </div>
          <Card className="border-border/60 bg-card/85 shadow-xl backdrop-blur">
            <CardHeader>
              <CardTitle>What teams do in Neolytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">1. Size the market</p>
                <p>See review volume, pricing, release timing, and revenue bands across real Steam comps.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">2. Pressure-test the niche</p>
                <p>Compare tags, genres, and traction to find overcrowded spaces before production starts.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">3. Build the watchlist</p>
                <p>Track launches, revenue leaders, and fast movers from one workspace.</p>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="text-base">Market discovery</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Search Steam titles, slice by genre and tag, and move quickly from broad idea to comp set.
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="text-base">Explainable estimates</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Revenue and sales models stay transparent, with ranges and confidence instead of black-box numbers.
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="text-base">Daily operating rhythm</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use one workspace to track launches, save games, compare competitors, and publish reports.
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 rounded-3xl border border-border/70 bg-card/60 p-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Built for</p>
            <p className="mt-2 text-xl font-semibold">Indie teams and publishers</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Data model</p>
            <p className="mt-2 text-xl font-semibold">Historical Steam snapshots</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Output</p>
            <p className="mt-2 text-xl font-semibold">Search, compare, opportunity, report</p>
          </div>
        </section>
      </div>
    </main>
  );
}
