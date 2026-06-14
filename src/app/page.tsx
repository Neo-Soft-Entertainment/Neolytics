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
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-20 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
      <div className="container relative space-y-12 py-12 lg:py-20">
        <header className="glass-surface animate-rise-in flex flex-col gap-4 rounded-[2rem] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <NeolyticsBrand />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ghost">
              <Link href="/games">Jogos</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/opportunities">Oportunidades</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={session ? "/dashboard" : "/login"}>
                {session ? "Abrir painel" : "Entrar"}
              </Link>
            </Button>
          </div>
        </header>
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div className="max-w-4xl space-y-6">
            <span className="glass-surface animate-rise-in inline-flex rounded-full px-3 py-1 text-sm text-muted-foreground">
              ERP de estúdio com foco em Steam, sistema operacional de mercado e camada de inteligência comercial
            </span>
            <div className="space-y-4">
              <h1 className="animate-rise-in text-5xl font-bold tracking-[-0.07em] sm:text-7xl">
                Encontre o mercado certo
                <span className="block bg-gradient-to-r from-cyan-500 via-sky-500 to-sky-300 bg-clip-text text-transparent">
                  antes de criar o jogo errado.
                </span>
              </h1>
              <p className="animate-rise-in-delay max-w-2xl text-lg leading-8 text-muted-foreground">
                A Neolytics transforma inteligência da Steam em um sistema operacional de estúdio:
                pesquise o mercado, valide o conceito, teste o caso de negócio e avance para projetos, financeiro, contratos e operações da empresa sem trocar de contexto.
              </p>
            </div>
            <div className="animate-rise-in-delay flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={session ? "/dashboard" : "/login"}>
                  {session ? "Abrir painel" : "Entrar"}
                </Link>
              </Button>
              {!session ? (
                <Button asChild size="lg" variant="secondary">
                  <Link href="/signup">Criar conta</Link>
                </Button>
              ) : null}
              <Button asChild size="lg" variant="outline">
                <Link href={session ? "/projects" : "/games"}>
                  {session ? "Abrir projetos" : "Explorar jogos"}
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="glass-surface animate-rise-in rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Sinal</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Mercado Steam</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Camada</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Sistema operacional</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Saída</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">GDD + quadro</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Modo</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Da pesquisa ao lançamento</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-slate-50 shadow-[0_30px_60px_rgba(2,6,23,0.24)]">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Tese operacional</p>
                <p className="mt-3 text-lg font-semibold">Inteligência comercial deve alimentar produção, financeiro e execução diretamente.</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Para quem serve</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Estúdios, publishers, investidores</p>
              </div>
              <div className="glass-surface animate-rise-in-delay rounded-[1.5rem] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Estilo de decisão</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.05em]">Explicável, histórico, prático</p>
              </div>
            </div>
          </div>
          <Card className="animate-rise-in-delay relative overflow-hidden border-white/10 bg-slate-950 text-slate-50 shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px shimmer-divider opacity-80" />
            <CardHeader>
              <CardTitle>O que equipes fazem na Neolytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">1. Dimensionam o mercado</p>
                <p className="mt-1">Veja volume de avaliações, preço, janela de lançamento e faixas de receita em comparáveis reais da Steam.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">2. Testam a pressão do nicho</p>
                <p className="mt-1">Compare tags, gêneros e tração para encontrar espaços saturados antes da produção começar.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">3. Montam a lista de acompanhamento</p>
                <p className="mt-1">Acompanhe lançamentos, líderes de receita e jogos em crescimento em uma única área de trabalho.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/15 to-sky-300/10 p-4">
                <p className="font-medium text-white">4. Validam o projeto</p>
                <p className="mt-1">Transforme um conceito em análise de mercado, GDD automatizado e quadro de entrega customizável.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Mercado</p>
                  <p className="mt-2 font-semibold text-white">Sinais</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Projeto</p>
                  <p className="mt-2 font-semibold text-white">Execução</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">ERP</p>
                  <p className="mt-2 font-semibold text-white">Operações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="animate-rise-in bg-white/65 dark:bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Descoberta de mercado</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Pesquise títulos da Steam, recorte por gênero e tag e avance rapidamente da ideia ampla para um conjunto comparável.
            </CardContent>
          </Card>
          <Card className="animate-rise-in-delay bg-white/65 dark:bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Estimativas explicáveis</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Modelos de receita e vendas permanecem transparentes, com faixas e confiança em vez de números de caixa-preta.
            </CardContent>
          </Card>
          <Card className="animate-rise-in-delay bg-white/65 dark:bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base">Sistema operacional de projetos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Rode análise de conceito, preencha hipóteses de mercado, gere GDDs, gerencie execução e avance para financeiro e fluxos da empresa em uma área de trabalho.
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <Card className="aurora-panel overflow-hidden border-white/10">
            <CardHeader>
              <CardTitle>Por que parece diferente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/50 p-5 backdrop-blur dark:bg-white/[0.04]">
                <p className="text-sm font-semibold">Uma cadeia de sinal</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Um insight de mercado pode virar uma tese de projeto, depois um GDD, depois um quadro, depois um orçamento e fluxo da empresa.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/50 p-5 backdrop-blur dark:bg-white/[0.04]">
                <p className="text-sm font-semibold">Sem chute de caixa-preta</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  As estimativas continuam explicáveis, a confiança fica explícita e a equipe consegue rastrear por que o sistema está dizendo o que diz.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-white/10 bg-slate-950 text-slate-50">
            <div className="pointer-events-none h-px w-full shimmer-divider opacity-80" />
            <CardHeader>
              <CardTitle>Construído para decisões sob pressão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>Quando um estúdio está decidindo o que construir, cortar, precificar ou apresentar, a interface precisa ser objetiva, calma e operacional.</p>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                Essa é a direção do produto: menos enfeite de painel, mais densidade de sinal com melhor gosto.
              </p>
            </CardContent>
          </Card>
        </section>
        <section className="glass-surface grid gap-4 rounded-[2rem] p-6 md:grid-cols-3">
          <div className="animate-rise-in">
            <p className="text-sm text-muted-foreground">Construído para</p>
            <p className="mt-2 text-xl font-semibold">Times indie e publishers</p>
          </div>
          <div className="animate-rise-in-delay">
            <p className="text-sm text-muted-foreground">Modelo de dados</p>
            <p className="mt-2 text-xl font-semibold">Snapshots históricos da Steam</p>
          </div>
          <div className="animate-rise-in-delay">
            <p className="text-sm text-muted-foreground">Saída</p>
            <p className="mt-2 text-xl font-semibold">Pesquisa, comparação, projetos, relatórios</p>
          </div>
        </section>
      </div>
    </main>
  );
}
