import Link from "next/link";

import { auth } from "@/auth";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 hero-grid opacity-50" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-10 right-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl animate-float-slow" />
      <div className="container relative space-y-12 py-12 lg:py-20">
        <header className="glass-surface animate-rise-in flex flex-col gap-4 rounded-[2rem] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <NeolyticsBrand />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ghost">
              <Link href="/games">Games</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/opportunities">Opportunities</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={session ? "/dashboard" : "/login"}>
                {session ? "Open dashboard" : "Sign in"}
              </Link>
            </Button>
          </div>
        </header>
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div className="max-w-4xl space-y-6">
            <span className="glass-surface animate-rise-in inline-flex rounded-full px-3 py-1 text-sm text-muted-foreground">
              Steam-first studio ERP, market operating system, and commercial intelligence layer
            </span>
            <div className="space-y-4">
              <h1 className="animate-rise-in text-5xl font-bold tracking-[-0.07em] sm:text-7xl">
                Find the right market
                <span className="block bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 bg-clip-text text-transparent">
                  before you build the wrong game.
                </span>
              </h1>
              <p className="animate-rise-in-delay max-w-2xl text-lg leading-8 text-muted-foreground">
                Neolytics turns Steam intelligence into a studio operating system:
                research the market, validate the concept, pressure-test the business case, and move into projects, finance, contracts, and company operations without context switching.
              </p>
            </div>
            <div className="animate-rise-in-delay flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={session ? "/dashboard" : "/login"}>
                  {session ? "Open dashboard" : "Sign in"}
                </Link>
              </Button>
              {!session ? (
                <Button asChild size="lg" variant="secondary">
                  <Link href="/signup">Create account</Link>
                </Button>
              ) : null}
              <Button asChild size="lg" variant="outline">
                <Link href={session ? "/projects" : "/games"}>
                  {session ? "Open projects" : "Explore games"}
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="glass-surface animate-rise-in rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Signal</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Steam market</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Layer</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Operating system</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Output</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">GDD + board</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Mode</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Search to ship</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-slate-50 shadow-[0_30px_60px_rgba(2,6,23,0.24)]">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Operating thesis</p>
                <p className="mt-3 text-lg font-semibold">Commercial intelligence should feed production, finance, and execution directly.</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Who it serves</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Studios, publishers, investors</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Decision style</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Explainable, historical, practical</p>
              </div>
            </div>
          </div>
          <Card className="animate-rise-in-delay relative overflow-hidden border-white/10 bg-slate-950 text-slate-50 shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px shimmer-divider opacity-80" />
            <CardHeader>
              <CardTitle>What teams do in Neolytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">1. Size the market</p>
                <p className="mt-1">See review volume, pricing, release timing, and revenue bands across real Steam comps.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">2. Pressure-test the niche</p>
                <p className="mt-1">Compare tags, genres, and traction to find overcrowded spaces before production starts.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">3. Build the watchlist</p>
                <p className="mt-1">Track launches, revenue leaders, and fast movers from one workspace.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/15 to-emerald-400/10 p-4">
                <p className="font-medium text-white">4. Validate the project</p>
                <p className="mt-1">Turn a concept into market analysis, an automated GDD, and a customizable delivery board.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Market</p>
                  <p className="mt-2 font-semibold text-white">Signals</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Project</p>
                  <p className="mt-2 font-semibold text-white">Execution</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">ERP</p>
                  <p className="mt-2 font-semibold text-white">Operations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="animate-rise-in bg-white/65 dark:bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Market discovery</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Search Steam titles, slice by genre and tag, and move quickly from broad idea to comp set.
            </CardContent>
          </Card>
          <Card className="animate-rise-in-delay bg-white/65 dark:bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Explainable estimates</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Revenue and sales models stay transparent, with ranges and confidence instead of black-box numbers.
            </CardContent>
          </Card>
          <Card className="animate-rise-in-delay bg-white/65 dark:bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Project operating system</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Run concept analysis, auto-fill market assumptions, generate GDDs, manage execution, and grow into finance and company workflows in one workspace.
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <Card className="aurora-panel overflow-hidden border-white/10">
            <CardHeader>
              <CardTitle>Why it feels different</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/50 p-5 backdrop-blur dark:bg-white/[0.04]">
                <p className="text-sm font-semibold">One signal chain</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  A market insight can become a project thesis, then a GDD, then a board, then a budget and company workflow.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/50 p-5 backdrop-blur dark:bg-white/[0.04]">
                <p className="text-sm font-semibold">No black-box guesswork</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Estimates stay explainable, confidence stays explicit, and the team can trace why the system is saying what it says.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-white/10 bg-slate-950 text-slate-50">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-80" />
            <CardHeader>
              <CardTitle>Built for decisions under pressure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>When a studio is deciding what to build, what to cut, what to price, or what to pitch, the interface should feel sharp, calm, and operational.</p>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                That is the direction this product is moving toward: less dashboard wallpaper, more signal density with better taste.
              </p>
            </CardContent>
          </Card>
        </section>
        <section className="glass-surface grid gap-4 rounded-[2rem] p-6 md:grid-cols-3">
          <div className="animate-rise-in">
            <p className="text-sm text-muted-foreground">Built for</p>
            <p className="mt-2 text-xl font-semibold">Indie teams and publishers</p>
          </div>
          <div className="animate-rise-in-delay">
            <p className="text-sm text-muted-foreground">Data model</p>
            <p className="mt-2 text-xl font-semibold">Historical Steam snapshots</p>
          </div>
          <div className="animate-rise-in-delay">
            <p className="text-sm text-muted-foreground">Output</p>
            <p className="mt-2 text-xl font-semibold">Search, compare, projects, reports</p>
          </div>
        </section>
      </div>
    </main>
  );
}
