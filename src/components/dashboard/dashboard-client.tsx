"use client";

import { useState } from "react";
import Link from "next/link";

import { PageHero } from "@/components/app-shell/page-hero";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ExportActions } from "@/components/export/export-actions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useDashboardDetails, useDashboardSummary } from "@/features/dashboard/hooks";
import { useProgressiveLoad } from "@/hooks/use-progressive-load";
import { formatCurrency, formatNumber } from "@/lib/utils";

const tourSteps = [
  {
    title: "Radar de mercado",
    description: "Use Jogos, Oportunidades e Comparar para ler demanda, preços, concorrentes, lançamentos e sinais de jogadores.",
    href: "/games",
    action: "Abrir jogos"
  },
  {
    title: "Comando de projeto",
    description: "Transforme uma tese em projeto, rode análises de viabilidade e arte, gerencie marcos, GDDs e o quadro de produção.",
    href: "/projects",
    action: "Abrir projetos"
  },
  {
    title: "Operações do estúdio",
    description: "Gerencie financeiro, registros da empresa, documentos, contratos, faturas, aprovações e trilhas de auditoria pela camada operacional.",
    href: "/finance",
    action: "Abrir financeiro"
  },
  {
    title: "Comunidade e relatórios",
    description: "Compartilhe sinais com a organização ou feed global, discuta posts, exporte painéis e crie relatórios de mercado.",
    href: "/community",
    action: "Abrir comunidade"
  }
];

export function DashboardClient() {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const progressive = useProgressiveLoad<HTMLDivElement>();
  const query = useDashboardSummary();
  const detailsQuery = useDashboardDetails(progressive.shouldLoad);

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando painel...</p>;
  }

  if (query.isError) {
    return <ErrorState title="Painel indisponível" description="Não foi possível carregar os dados do painel." />;
  }

  const data = query.data;
  const details = detailsQuery.data;

  if (!data) {
    return (
      <EmptyState
        title="O catálogo ainda está aquecendo"
        description="A Neolytics está pronta, mas o dataset da Steam ainda não foi populado neste ambiente."
      />
    );
  }

    let resolvedValue0: any;
  if (data.canAccessFinanceWorkspace) {
    resolvedValue0 = (
              <Button asChild variant="outline">
                <Link href="/finance">Abrir financeiro</Link>
              </Button>
            );
  } else {
    resolvedValue0 = null;
  }
  let resolvedValue1: any;
  if (data.canAccessFinanceWorkspace) {
    resolvedValue1 = (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Caixa líquido" value={formatCurrency(data.financeSnapshot.netCashCents)} />
          <KpiCard label="Recebíveis pendentes" value={formatCurrency(data.financeSnapshot.pendingRevenueCents)} />
          <KpiCard label="Pagáveis pendentes" value={formatCurrency(data.financeSnapshot.pendingExpenseCents)} />
          <KpiCard label="Orçamentos ativos" value={formatNumber(data.financeSnapshot.activeBudgetsCount)} />
        </div>
      );
  } else {
    resolvedValue1 = (
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium">Área financeira libera no Plus</p>
              <p className="mt-1 text-sm text-muted-foreground">Faça upgrade para rodar orçamentos, faturas e operações da empresa aqui.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/settings">Ver planos</Link>
            </Button>
          </CardContent>
        </Card>
      );
  }
  let resolvedValue2: any;
  if (data.portfolioReadiness) {
    resolvedValue2 = (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Oportunidade do portfólio" value={formatNumber(data.portfolioReadiness.averageOpportunityScore)} />
          <KpiCard label="Risco do portfólio" value={formatNumber(data.portfolioReadiness.averageRiskScore)} />
          <KpiCard label="Fit do portfólio" value={formatNumber(data.portfolioReadiness.averageFitScore)} />
          <KpiCard label="Teses analisadas" value={formatNumber(data.projectSignalsCount)} />
        </div>
      );
  } else {
    resolvedValue2 = null;
  }
  let resolvedValue3: any;
  if (!details) {
    resolvedValue3 = (
              <p className="text-sm text-muted-foreground">Carregando sinais de projetos em segundo plano...</p>
            );
  } else {
        let resolvedValue9: any;
    if (details.projectSignals.length === 0) {
      resolvedValue9 = (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Rode análise de mercado em um projeto para iniciar o quadro.</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/projects">Abrir projetos</Link>
                </Button>
              </div>
            );
    } else {
      resolvedValue9 = (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Oportunidade</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead>Fit</TableHead>
                    <TableHead>Confiança</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.projectSignals.map((item: any) => (
                    <TableRow key={item.projectId}>
                      <TableCell>
                        <Link className="font-medium hover:underline" href={`/projects/${item.projectId}`}>
                          {item.projectName}
                        </Link>
                      </TableCell>
                      <TableCell>{formatNumber(item.opportunityScore)}</TableCell>
                      <TableCell>{formatNumber(item.riskScore)}</TableCell>
                      <TableCell>{formatNumber(item.fitScore)}</TableCell>
                      <TableCell>{formatNumber(item.confidenceScore)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
    }
resolvedValue3 = resolvedValue9;
  }
  let resolvedValue4: any;
  if (!details) {
    resolvedValue4 = (
              <p className="text-sm text-muted-foreground">Carregando jogos salvos em segundo plano...</p>
            );
  } else {
        let resolvedValue10: any;
    if (details.trackedGames.length === 0) {
      resolvedValue10 = (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Nenhum jogo salvo ainda. Comece com uma shortlist.</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/games">Criar shortlist</Link>
                </Button>
              </div>
            );
    } else {
      resolvedValue10 = (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jogo</TableHead>
                    <TableHead>Avaliações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.trackedGames.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link className="font-medium hover:underline" href={`/games/${item.steamGame.appId}`}>
                          {item.steamGame.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatNumber(item.steamGame.reviewCount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
    }
resolvedValue4 = resolvedValue10;
  }
  let resolvedValue5: any;
  if (!details) {
    resolvedValue5 = (
              <p className="text-sm text-muted-foreground">Carregando lançamentos recentes em segundo plano...</p>
            );
  } else {
    resolvedValue5 = (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogo</TableHead>
                  <TableHead>Data de lançamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.recentLaunches.map((game: any) => {
                  let resolvedValue11: any;
                  if (game.releaseDate) {
                    resolvedValue11 = new Date(game.releaseDate).toLocaleDateString();
                  } else {
                    resolvedValue11 = "N/A";
                  }
                  return (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${game.appId}`}>
                        {game.name}
                      </Link>
                    </TableCell>
                    <TableCell>{resolvedValue11}</TableCell>
                  </TableRow>
                );
                })}
              </TableBody>
            </Table>
            );
  }
  let resolvedValue6: any;
  if (data.portfolioReadiness?.topThesis) {
    resolvedValue6 = (
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Principal tese atual</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg font-semibold">{data.portfolioReadiness.topThesis.projectName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Estágio: {data.portfolioReadiness.topThesis.stage.replaceAll("_", " ")} · Oportunidade {formatNumber(data.portfolioReadiness.topThesis.opportunityScore)} · Fit {formatNumber(data.portfolioReadiness.topThesis.fitScore)}
              </p>
            </div>
            <Button asChild>
              <Link href={`/projects/${data.portfolioReadiness.topThesis.projectId}`}>Abrir tese</Link>
            </Button>
          </CardContent>
        </Card>
      );
  } else {
    resolvedValue6 = null;
  }
  let resolvedValue7: any;
  if (!details) {
    resolvedValue7 = (
              <p className="text-sm text-muted-foreground">Carregando ranking de receita em segundo plano...</p>
            );
  } else {
    resolvedValue7 = (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogo</TableHead>
                  <TableHead>Receita líquida estimada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.topRevenue.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${item.steamGame.appId}`}>
                        {item.steamGame.name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatCurrency(item.medianNetRevenueCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            );
  }
  let resolvedValue8: any;
  if (!details) {
    resolvedValue8 = (
              <p className="text-sm text-muted-foreground">Carregando sinais de crescimento em segundo plano...</p>
            );
  } else {
    resolvedValue8 = (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogo</TableHead>
                  <TableHead>Total de avaliações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.fastestGrowing.map((game: any) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/games/${game.appId}`}>
                        {game.name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatNumber(game.reviewCount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            );
  }
return (
    <div className="space-y-6">
      <PageHero
        title="Central de comando do estúdio"
        description="Rode inteligência de mercado, produção, financeiro e governança da empresa em uma camada operacional."
        actions={(
          <>
            <Badge variant="secondary">Plano {data.planLabel}</Badge>
            <Button asChild>
              <Link href="/games">Explorar jogos</Link>
            </Button>
            {resolvedValue0}
            <Button asChild variant="outline">
              <Link href="/opportunities">Abrir oportunidades</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/compare">Comparar jogos</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsTourOpen(true)}>
              Tour opcional
            </Button>
            <ExportActions
              label="Exportar"
              xlsxHref="/api/exports/dashboard?format=xlsx"
              csvHref="/api/exports/dashboard?format=csv"
              googleSheetsEndpoint="/api/exports/dashboard"
            />
          </>
        )}
      />
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Jogos no catálogo" value={formatNumber(data.marketOverview.totalGames)} />
        <KpiCard
          label="Nota média das avaliações"
          value={`${data.marketOverview.averageReviewScore.toFixed(1)}%`}
        />
        <KpiCard label="Jogos salvos" value={formatNumber(data.marketOverview.trackedGamesCount)} />
        <KpiCard label="Lançamentos recentes" value={formatNumber(data.recentLaunchesCount)} />
      </div>
      {resolvedValue1}
      {resolvedValue2}
      <Dialog open={isTourOpen} onOpenChange={setIsTourOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tour opcional</DialogTitle>
            <DialogDescription>
              Um mapa rápido das principais áreas operacionais. Nada aqui altera sua área de trabalho.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {tourSteps.map((step) => (
              <div key={step.title} className="rounded-lg border bg-card p-4">
                <p className="font-medium">{step.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                <Button asChild className="mt-4" size="sm" variant="outline">
                  <Link href={step.href} onClick={() => setIsTourOpen(false)}>
                    {step.action}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <div ref={progressive.ref} className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Quadro de projetos</CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedValue3}
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Jogos acompanhados</CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedValue4}
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Lançamentos recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedValue5}
          </CardContent>
        </Card>
      </div>
      {resolvedValue6}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Maiores receitas</CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedValue7}
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
          <CardHeader>
            <CardTitle>Maior crescimento de avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            {resolvedValue8}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
