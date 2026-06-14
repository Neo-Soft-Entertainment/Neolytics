"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/error-state";
import { ExportActions } from "@/components/export/export-actions";
import { ChartCard } from "@/components/charts/chart-card";
import { HistoryLineChart } from "@/components/charts/history-line-chart";
import { useGameDatabaseProfile, useGameDetails, useGameHistory, useGameSnapshots } from "@/features/games/hooks";
import { useProgressiveLoad } from "@/hooks/use-progressive-load";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function GameDetailClient({ appId }: { appId: number }) {
  const databaseLoad = useProgressiveLoad<HTMLDivElement>();
  const historyLoad = useProgressiveLoad<HTMLDivElement>();
  const detailsQuery = useGameDetails(appId);
  const historyQuery = useGameHistory(appId, historyLoad.shouldLoad);
  const databaseProfileQuery = useGameDatabaseProfile(appId, databaseLoad.shouldLoad);
  const snapshotsQuery = useGameSnapshots(appId, historyLoad.shouldLoad && Boolean(detailsQuery.data?.steamXrayAccess.rawSnapshotsBetaAvailable));

  if (detailsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando detalhes do jogo...</p>;
  }

  if (detailsQuery.isError || !detailsQuery.data) {
    return <ErrorState title="Jogo indisponível" description="Não foi possível carregar este jogo da Steam." />;
  }

  const game: any = detailsQuery.data;
  const history: any = historyQuery.data;
  const snapshots: any[] = snapshotsQuery.data ?? [];
  const databaseProfile = databaseProfileQuery.data;

    let resolvedValue0: any;
  if (game.steamXrayAccess.playerHistoryAvailable) {
    resolvedValue0 = `${game.steamXrayAccess.historyLimit} dias de histórico estão disponíveis neste plano.`;
  } else {
    resolvedValue0 = `Este plano inclui ${game.steamXrayAccess.historyLimit} dias de histórico de preço e avaliações.`;
  }
  let resolvedValue1: any;
  if (game.reviewScore) {
    resolvedValue1 = `${game.reviewScore.toFixed(1)}%`;
  } else {
    resolvedValue1 = "N/A";
  }
  let resolvedValue2: any;
  if (databaseProfile) {
        let resolvedValue9: any;
    if (databaseProfile.trendDetection.emergingTags.length > 0) {
      resolvedValue9 = (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {databaseProfile.trendDetection.emergingTags.map((tag: any) => (
                        <Badge key={tag.name} variant="secondary">
                          {`${tag.name} ${tag.recentSharePercent}% recente`}
                        </Badge>
                      ))}
                    </div>
                  );
    } else {
      resolvedValue9 = null;
    }
    let resolvedValue10: any;
    if (databaseProfile.competitiveIntelligence.directCompetitors.length > 0) {
      resolvedValue10 = (
                    databaseProfile.competitiveIntelligence.directCompetitors.slice(0, 5).map((competitor) => {
                      let resolvedValue15: any;
                      if (competitor.reviewScore) {
                        resolvedValue15 = `${competitor.reviewScore.toFixed(1)}%`;
                      } else {
                        resolvedValue15 = "N/A";
                      }
                      return (
                      <Link key={competitor.appId} className="block rounded-xl border p-3 text-sm hover:bg-muted/50" href={`/games/${competitor.appId}`}>
                        <span className="font-medium">{competitor.name}</span>
                        <span className="mt-1 block text-muted-foreground">
                          {`${formatNumber(competitor.reviewCount)} avaliações · ${resolvedValue15} nota · ${formatCurrency(competitor.estimatedMedianNetRevenueCents)}`}
                        </span>
                      </Link>
                    );
                    })
                  );
    } else {
      resolvedValue10 = (
                    <p className="text-sm text-muted-foreground">Nenhum concorrente direto identificado no recorte atual do banco de dados.</p>
                  );
    }
    let resolvedValue11: any;
    if (databaseProfile.competitiveIntelligence.recentSuccessfulLaunches.length > 0) {
      resolvedValue11 = (
                    databaseProfile.competitiveIntelligence.recentSuccessfulLaunches.slice(0, 5).map((competitor) => {
                      let resolvedValue16: any;
                      if (competitor.reviewScore) {
                        resolvedValue16 = `${competitor.reviewScore.toFixed(1)}%`;
                      } else {
                        resolvedValue16 = "N/A";
                      }
                      return (
                      <Link key={competitor.appId} className="block rounded-xl border p-3 text-sm hover:bg-muted/50" href={`/games/${competitor.appId}`}>
                        <span className="font-medium">{competitor.name}</span>
                        <span className="mt-1 block text-muted-foreground">
                          {`${formatNumber(competitor.reviewCount)} avaliações · ${resolvedValue16} nota`}
                        </span>
                      </Link>
                    );
                    })
                  );
    } else {
      resolvedValue11 = (
                    <p className="text-sm text-muted-foreground">Nenhum lançamento recente de destaque identificado ainda.</p>
                  );
    }
resolvedValue2 = (
        <Card className="overflow-hidden border-cyan-400/20 bg-gradient-to-br from-card via-card to-cyan-500/10">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Neolytics Steam Database</CardTitle>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Inteligência no estilo SteamDB gerada com dados oficiais da Steam, snapshots da Neolytics e pontuação determinística. Nenhuma API da SteamDB ou scraping é usada.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{databaseProfile.classification}</Badge>
                <Badge variant="outline">{`${databaseProfile.confidenceLevel} confiança`}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Oportunidade</p>
                <p className="mt-2 text-3xl font-semibold">{databaseProfile.opportunityScore}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Qualidade dos dados</p>
                <p className="mt-2 text-3xl font-semibold">{databaseProfile.dataQuality.score}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Recorte comparável</p>
                <p className="mt-2 text-3xl font-semibold">{formatNumber(databaseProfile.dataQuality.peerDatasetSize)}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Momento</p>
                <p className="mt-2 text-3xl font-semibold">{databaseProfile.trendDetection.releaseMomentum}</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Fatores ponderados da nota</h3>
                {databaseProfile.weightedFactors.map((factor: any) => (
                  <div key={factor.name} className="rounded-2xl border bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{factor.name}</p>
                      <Badge variant="outline">{`${factor.score}/100 · ${factor.weight}%`}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{factor.evidence}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border bg-background/70 p-4">
                  <h3 className="text-sm font-semibold">Histórico observado</h3>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <p>{`Menor preço observado: ${formatCurrency(databaseProfile.observedHistory.price.lowestObservedPriceCents)}`}</p>
                    <p>{`Maior preço observado: ${formatCurrency(databaseProfile.observedHistory.price.highestObservedPriceCents)}`}</p>
                    <p>{`Snapshots com desconto: ${formatNumber(databaseProfile.observedHistory.price.discountSnapshotCount)}`}</p>
                    <p>{`Pico de jogadores observado: ${formatNumber(databaseProfile.observedHistory.players.peakObservedPlayers)}`}</p>
                    <p>{`Média de jogadores observada: ${formatNumber(databaseProfile.observedHistory.players.averageObservedPlayers)}`}</p>
                  </div>
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  <h3 className="text-sm font-semibold">Detecção de tendências</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{databaseProfile.trendDetection.explanation}</p>
                  {resolvedValue9}
                </div>
                <div className="rounded-2xl border bg-background/70 p-4">
                  <h3 className="text-sm font-semibold">Fontes usadas</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{databaseProfile.sources.join(" · ")}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-background/70 p-4">
                <h3 className="text-sm font-semibold">Concorrentes diretos</h3>
                <div className="mt-3 space-y-2">
                  {resolvedValue10}
                </div>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <h3 className="text-sm font-semibold">Lançamentos recentes para observar</h3>
                <div className="mt-3 space-y-2">
                  {resolvedValue11}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
  } else {
        let resolvedValue12: any;
    if (databaseProfileQuery.isError) {
      resolvedValue12 = "Não foi possível carregar o perfil do banco de dados agora.";
    } else {
            let resolvedValue17: any;
      if (databaseProfileQuery.isFetching) {
        resolvedValue17 = "Carregando perfil do banco de dados em segundo plano...";
      } else {
        resolvedValue17 = "O perfil avançado do banco de dados será carregado conforme você continuar.";
      }
resolvedValue12 = resolvedValue17;
    }
resolvedValue2 = (
        <Card>
          <CardHeader>
            <CardTitle>Neolytics Steam Database</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {resolvedValue12}
          </CardContent>
        </Card>
      );
  }
  let resolvedValue3: any;
  if (history?.priceHistory?.length) {
    resolvedValue3 = (
            <HistoryLineChart
              data={history.priceHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                price: (item.finalPriceCents ?? 0) / 100
              }))}
              xKey="date"
              yKey="price"
            />
          );
  } else {
    resolvedValue3 = (
            <p className="text-sm text-muted-foreground">Ainda não há histórico de preço.</p>
          );
  }
  let resolvedValue4: any;
  if (history?.reviewHistory?.length) {
    resolvedValue4 = (
            <HistoryLineChart
              data={history.reviewHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                reviews: item.totalReviews
              }))}
              xKey="date"
              yKey="reviews"
            />
          );
  } else {
    resolvedValue4 = (
            <p className="text-sm text-muted-foreground">Ainda não há histórico de avaliações.</p>
          );
  }
  let resolvedValue5: any;
  if (game.steamXrayAccess.playerHistoryAvailable && history?.playerHistory?.length) {
    resolvedValue5 = (
            <HistoryLineChart
              data={history.playerHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                players: item.currentPlayers
              }))}
              xKey="date"
              yKey="players"
            />
          );
  } else {
        let resolvedValue13: any;
    if (game.steamXrayAccess.playerHistoryAvailable) {
      resolvedValue13 = (
            <p className="text-sm text-muted-foreground">Ainda não há histórico de jogadores.</p>
          );
    } else {
      resolvedValue13 = (
            <p className="text-sm text-muted-foreground">Histórico de jogadores simultâneos começa no Plus.</p>
          );
    }
resolvedValue5 = resolvedValue13;
  }
  let resolvedValue6: any;
  if (game.steamXrayAccess.playerHistoryAvailable) {
    resolvedValue6 = "Histórico de jogadores está disponível neste plano.";
  } else {
    resolvedValue6 = "Histórico de jogadores libera no Plus e no Pro.";
  }
  let resolvedValue7: any;
  if (game.steamXrayAccess.rawSnapshotsBetaAvailable) {
    resolvedValue7 = "Stream beta de snapshots brutos está ativo neste nível de acesso.";
  } else {
    resolvedValue7 = "Stream beta de snapshots brutos exige acesso antecipado.";
  }
  let resolvedValue8: any;
  if (game.steamXrayAccess.rawSnapshotsBetaAvailable) {
        let resolvedValue14: any;
    if (snapshots.length > 0) {
      resolvedValue14 = (
              snapshots.slice(0, 10).map((snapshot) => {
                let resolvedValue18: any;
                if (snapshot.reviewScore) {
                  resolvedValue18 = `${snapshot.reviewScore.toFixed(1)}%`;
                } else {
                  resolvedValue18 = "N/A";
                }
                return (
                <div key={snapshot.snapshotDate} className="rounded-2xl border p-3">
                  <p className="font-medium">{new Date(snapshot.snapshotDate).toLocaleString()}</p>
                  <p className="text-muted-foreground">
                    {`Jogadores: ${formatNumber(snapshot.currentPlayers ?? null)} · Nota das avaliações: ${resolvedValue18}`}
                  </p>
                </div>
              );
              })
            );
    } else {
      resolvedValue14 = (
              <p className="text-muted-foreground">Ainda não há snapshots brutos disponíveis.</p>
            );
    }
resolvedValue8 = (
        <Card>
          <CardHeader>
            <CardTitle>Stream beta de snapshots brutos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {resolvedValue14}
          </CardContent>
        </Card>
      );
  } else {
    resolvedValue8 = null;
  }
return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {game.genres.map((genre: any) => (
              <Badge key={genre.steamGenreId ?? genre.steamGenre.id} variant="secondary">
                {genre.steamGenre.name}
              </Badge>
            ))}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{game.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{game.shortDescription ?? "Nenhuma descrição disponível."}</p>
          </div>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle>Snapshot atual</CardTitle>
              <Badge variant="outline">{`Steam X-Ray · ${game.steamXrayAccess.label}`}</Badge>
            </div>
            <ExportActions
              label="Exportar"
              xlsxHref={`/api/exports/games/${appId}?format=xlsx`}
              csvHref={`/api/exports/games/${appId}?format=csv`}
              googleSheetsEndpoint={`/api/exports/games/${appId}`}
            />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {resolvedValue0}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Preço</span>
              <span>{formatCurrency(game.priceCurrent?.finalPriceCents ?? null)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avaliações</span>
              <span>{formatNumber(game.reviewCount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nota das avaliações</span>
              <span>{resolvedValue1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Jogadores atuais</span>
              <span>{formatNumber(game.currentPlayers)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div ref={databaseLoad.ref}>
      {resolvedValue2}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas estimadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Baixa: {formatNumber(game.salesEstimates[0]?.lowEstimate ?? null)}</p>
            <p>Mediana: {formatNumber(game.salesEstimates[0]?.medianEstimate ?? null)}</p>
            <p>Alta: {formatNumber(game.salesEstimates[0]?.highEstimate ?? null)}</p>
            <p>Confiança: {game.salesEstimates[0]?.confidence ?? "N/A"}</p>
            <p className="text-muted-foreground">{game.salesEstimates[0]?.explanation ?? "Nenhuma estimativa disponível ainda."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receita estimada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Líquida baixa: {formatCurrency(game.revenueEstimates[0]?.lowNetRevenueCents ?? null)}</p>
            <p>Líquida mediana: {formatCurrency(game.revenueEstimates[0]?.medianNetRevenueCents ?? null)}</p>
            <p>Líquida alta: {formatCurrency(game.revenueEstimates[0]?.highNetRevenueCents ?? null)}</p>
            <p>Confiança: {game.revenueEstimates[0]?.confidence ?? "N/A"}</p>
            <p className="text-muted-foreground">{game.revenueEstimates[0]?.explanation ?? "Nenhuma estimativa de receita disponível ainda."}</p>
          </CardContent>
        </Card>
      </div>
      <div ref={historyLoad.ref} className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Histórico de preço">
          {resolvedValue3}
        </ChartCard>
        <ChartCard title="Histórico de avaliações">
          {resolvedValue4}
        </ChartCard>
        <ChartCard title="Histórico de jogadores">
          {resolvedValue5}
        </ChartCard>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Escopo do Steam X-Ray</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{`Plano atual: ${game.steamXrayAccess.label}.`}</p>
          <p>{`Janela de histórico: ${game.steamXrayAccess.historyLimit} dias para dados de gráfico.`}</p>
          <p>{resolvedValue6}</p>
          <p>{resolvedValue7}</p>
        </CardContent>
      </Card>
      {resolvedValue8}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Desenvolvedores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {game.developers.map((developer: any) => developer.steamDeveloper.name).join(", ") || "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Publicadoras</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {game.publishers.map((publisher: any) => publisher.steamPublisher.name).join(", ") || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
