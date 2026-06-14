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
              {game.steamXrayAccess.playerHistoryAvailable
                ? `${game.steamXrayAccess.historyLimit} dias de histórico estão disponíveis neste plano.`
                : `Este plano inclui ${game.steamXrayAccess.historyLimit} dias de histórico de preço e avaliações.`}
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
              <span>{game.reviewScore ? `${game.reviewScore.toFixed(1)}%` : "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Jogadores atuais</span>
              <span>{formatNumber(game.currentPlayers)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div ref={databaseLoad.ref}>
      {databaseProfile ? (
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
                {databaseProfile.weightedFactors.map((factor) => (
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
                  {databaseProfile.trendDetection.emergingTags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {databaseProfile.trendDetection.emergingTags.map((tag) => (
                        <Badge key={tag.name} variant="secondary">
                          {`${tag.name} ${tag.recentSharePercent}% recente`}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
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
                  {databaseProfile.competitiveIntelligence.directCompetitors.length > 0 ? (
                    databaseProfile.competitiveIntelligence.directCompetitors.slice(0, 5).map((competitor) => (
                      <Link key={competitor.appId} className="block rounded-xl border p-3 text-sm hover:bg-muted/50" href={`/games/${competitor.appId}`}>
                        <span className="font-medium">{competitor.name}</span>
                        <span className="mt-1 block text-muted-foreground">
                          {`${formatNumber(competitor.reviewCount)} avaliações · ${competitor.reviewScore ? `${competitor.reviewScore.toFixed(1)}%` : "N/A"} nota · ${formatCurrency(competitor.estimatedMedianNetRevenueCents)}`}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum concorrente direto identificado no recorte atual do banco de dados.</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <h3 className="text-sm font-semibold">Lançamentos recentes para observar</h3>
                <div className="mt-3 space-y-2">
                  {databaseProfile.competitiveIntelligence.recentSuccessfulLaunches.length > 0 ? (
                    databaseProfile.competitiveIntelligence.recentSuccessfulLaunches.slice(0, 5).map((competitor) => (
                      <Link key={competitor.appId} className="block rounded-xl border p-3 text-sm hover:bg-muted/50" href={`/games/${competitor.appId}`}>
                        <span className="font-medium">{competitor.name}</span>
                        <span className="mt-1 block text-muted-foreground">
                          {`${formatNumber(competitor.reviewCount)} avaliações · ${competitor.reviewScore ? `${competitor.reviewScore.toFixed(1)}%` : "N/A"} nota`}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum lançamento recente de destaque identificado ainda.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Neolytics Steam Database</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {databaseProfileQuery.isError
              ? "Não foi possível carregar o perfil do banco de dados agora."
              : databaseProfileQuery.isFetching
                ? "Carregando perfil do banco de dados em segundo plano..."
                : "O perfil avançado do banco de dados será carregado conforme você continuar."}
          </CardContent>
        </Card>
      )}
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
          {history?.priceHistory?.length ? (
            <HistoryLineChart
              data={history.priceHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                price: (item.finalPriceCents ?? 0) / 100
              }))}
              xKey="date"
              yKey="price"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Ainda não há histórico de preço.</p>
          )}
        </ChartCard>
        <ChartCard title="Histórico de avaliações">
          {history?.reviewHistory?.length ? (
            <HistoryLineChart
              data={history.reviewHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                reviews: item.totalReviews
              }))}
              xKey="date"
              yKey="reviews"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Ainda não há histórico de avaliações.</p>
          )}
        </ChartCard>
        <ChartCard title="Histórico de jogadores">
          {game.steamXrayAccess.playerHistoryAvailable && history?.playerHistory?.length ? (
            <HistoryLineChart
              data={history.playerHistory.map((item: any) => ({
                date: new Date(item.snapshotDate).toLocaleDateString(),
                players: item.currentPlayers
              }))}
              xKey="date"
              yKey="players"
            />
          ) : game.steamXrayAccess.playerHistoryAvailable ? (
            <p className="text-sm text-muted-foreground">Ainda não há histórico de jogadores.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Histórico de jogadores simultâneos começa no Plus.</p>
          )}
        </ChartCard>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Escopo do Steam X-Ray</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{`Plano atual: ${game.steamXrayAccess.label}.`}</p>
          <p>{`Janela de histórico: ${game.steamXrayAccess.historyLimit} dias para dados de gráfico.`}</p>
          <p>{game.steamXrayAccess.playerHistoryAvailable ? "Histórico de jogadores está disponível neste plano." : "Histórico de jogadores libera no Plus e no Pro."}</p>
          <p>{game.steamXrayAccess.rawSnapshotsBetaAvailable ? "Stream beta de snapshots brutos está ativo neste nível de acesso." : "Stream beta de snapshots brutos exige acesso antecipado."}</p>
        </CardContent>
      </Card>
      {game.steamXrayAccess.rawSnapshotsBetaAvailable ? (
        <Card>
          <CardHeader>
            <CardTitle>Stream beta de snapshots brutos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {snapshots.length > 0 ? (
              snapshots.slice(0, 10).map((snapshot) => (
                <div key={snapshot.snapshotDate} className="rounded-2xl border p-3">
                  <p className="font-medium">{new Date(snapshot.snapshotDate).toLocaleString()}</p>
                  <p className="text-muted-foreground">
                    {`Jogadores: ${formatNumber(snapshot.currentPlayers ?? null)} · Nota das avaliações: ${snapshot.reviewScore ? `${snapshot.reviewScore.toFixed(1)}%` : "N/A"}`}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Ainda não há snapshots brutos disponíveis.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
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
