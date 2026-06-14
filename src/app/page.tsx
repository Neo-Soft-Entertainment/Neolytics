import Link from "next/link";

import { auth } from "@/auth";
import { NeolyticsBrand } from "@/components/brand/neolytics-brand";
import { Button } from "@/components/ui/button";

const operatingLayers = [
  {
    title: "Mercado",
    description: "Compare jogos reais, histórico de receita, preço, reviews e janelas de lançamento antes de comprometer produção."
  },
  {
    title: "Projeto",
    description: "Transforme uma tese em GDD, board, milestones, owners, prioridades e plano de execução dentro do mesmo contexto."
  },
  {
    title: "Operação",
    description: "Conecte orçamento, contratos, contas a pagar, contas a receber e governança ao portfólio do estúdio."
  }
];

const metrics = [
  { label: "Camada", value: "ERP de estúdio" },
  { label: "Fonte", value: "Steam + operação" },
  { label: "Foco", value: "Decisão executável" }
];

export default async function HomePage() {
  const session = await auth();
  let primaryHref = "/login";
  let primaryLabel = "Entrar";
  let secondaryHref = "/games";
  let secondaryLabel = "Explorar jogos";

  if (session) {
    primaryHref = "/dashboard";
    primaryLabel = "Abrir painel";
    secondaryHref = "/projects";
    secondaryLabel = "Abrir projetos";
  }

  let signupAction = null;

  if (!session) {
    signupAction = (
      <Button asChild size="lg" variant="outline">
        <Link href="/signup">Criar conta</Link>
      </Button>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-slate-50">
      <section className="border-b border-white/10 bg-[#081625]">
        <div className="container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <NeolyticsBrand />
          <nav className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white">
              <Link href="/games">Jogos</Link>
            </Button>
            <Button asChild variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white">
              <Link href="/opportunities">Oportunidades</Link>
            </Button>
            <Button asChild>
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </nav>
        </div>
      </section>

      <section className="bg-[#09192a]">
        <div className="container grid min-h-[calc(100vh-76px)] gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center lg:py-16">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
              Centro operacional para game studios
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl">
                Decida o que construir, financiar e lançar com o estúdio inteiro no mesmo sistema.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Neolytics une inteligência de mercado, execução de projeto e ERP financeiro para transformar sinal comercial em operação real: GDD, board, orçamento, contratos e acompanhamento.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
              {signupAction}
              <Button asChild size="lg" variant="secondary">
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#101b2a] shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">Studio command center</p>
                <p className="text-xs text-slate-500">Resumo operacional ao vivo</p>
              </div>
              <span className="rounded-full bg-sky-400/15 px-3 py-1 text-xs font-medium text-sky-100">Pro</span>
            </div>
            <div className="grid gap-3 p-5">
              <div className="rounded-md border border-white/10 bg-[#0b1320] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Projeto</p>
                    <p className="mt-2 text-xl font-semibold text-white">Apex Legends-like market test</p>
                  </div>
                  <span className="rounded bg-sky-400 px-2 py-1 text-xs font-semibold text-slate-950">62 oportunidade</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded bg-white/[0.04] p-3">
                    <p className="text-[11px] text-slate-500">Board</p>
                    <p className="mt-1 font-semibold">18 cards</p>
                  </div>
                  <div className="rounded bg-white/[0.04] p-3">
                    <p className="text-[11px] text-slate-500">Budget</p>
                    <p className="mt-1 font-semibold">$128k</p>
                  </div>
                  <div className="rounded bg-white/[0.04] p-3">
                    <p className="text-[11px] text-slate-500">Cash</p>
                    <p className="mt-1 font-semibold">+24%</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-[#0b1320] p-4">
                  <p className="text-sm font-semibold">Sinais de mercado</p>
                  <div className="mt-4 space-y-3">
                    <div className="h-2 rounded bg-sky-300" />
                    <div className="h-2 w-10/12 rounded bg-sky-500/70" />
                    <div className="h-2 w-7/12 rounded bg-sky-700/70" />
                  </div>
                </div>
                <div className="rounded-md border border-white/10 bg-[#0b1320] p-4">
                  <p className="text-sm font-semibold">Execução</p>
                  <div className="mt-4 grid gap-2">
                    <div className="rounded bg-white/[0.04] px-3 py-2 text-xs text-slate-300">Milestone: Vertical slice</div>
                    <div className="rounded bg-white/[0.04] px-3 py-2 text-xs text-slate-300">Owner: Production</div>
                    <div className="rounded bg-white/[0.04] px-3 py-2 text-xs text-slate-300">Risk: pricing gap</div>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-sky-300/20 bg-sky-300/10 p-4 text-sm leading-6 text-slate-200">
                Diretriz: validar posicionamento e custo antes de escalar produção.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#07111f] py-14">
        <div className="container grid gap-4 md:grid-cols-3">
          {operatingLayers.map((item) => (
            <article key={item.title} className="rounded-lg border border-white/10 bg-[#0d1827] p-6">
              <p className="text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#09192a] py-14">
        <div className="container grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">Produto, não template</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Uma interface pública com a mesma linguagem do dashboard.</h2>
            <p className="text-sm leading-7 text-slate-400">
              Menos efeitos genéricos, mais superfícies sólidas, dados escaneáveis e decisões visíveis. O site apresenta o mesmo produto que a equipe usa por dentro.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-[#101b2a] p-5">
              <p className="font-semibold text-white">Operacional por padrão</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">A landing explica como mercado, produção e financeiro conversam sem depender de discurso genérico.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#101b2a] p-5">
              <p className="font-semibold text-white">Densa sem ruído</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">O visual privilegia cards simples, bordas sutis, tipografia direta e um preview de produto que parece usável.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#101b2a] p-5 sm:col-span-2">
              <p className="font-semibold text-white">Fluxo completo</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Começa em análise de mercado, passa por projeto e termina em operação de estúdio: o argumento comercial vira workflow.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
