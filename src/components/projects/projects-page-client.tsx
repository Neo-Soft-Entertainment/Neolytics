"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { PageHero } from "@/components/app-shell/page-hero";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProjects } from "@/features/projects/hooks";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function ProjectsPageClient() {
  const router = useRouter();
  const t = useI18n();
  const query = useProjects();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    elevatorPitch: "",
    description: "",
    genreInput: "",
    tagInput: "",
    monetizationModel: "",
    pricePointCents: ""
  });

  async function createProject() {
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        pricePointCents: form.pricePointCents ? Number(form.pricePointCents) : null
      })
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? t("projects.createProjectError"));
      return;
    }

    const project = (await response.json()) as { id: string };
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHero
        title={t("projects.pageTitle")}
        description={t("projects.pageDescription")}
        actions={(
          <>
            <span className="rounded-full border border-white/10 bg-white/55 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
              {t("projects.marketOs")}
            </span>
            <span className="rounded-full border border-white/10 bg-white/55 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
              {t("projects.gddBoardAnalysis")}
            </span>
          </>
        )}
        summary={(
          <div className="grid gap-2.5 rounded-[1rem] border border-white/10 bg-background/70 p-3 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("projects.portfolioSize")}</span>
              <span className="font-medium">{query.data?.length ?? 0} {t("projects.pageTitle").toLowerCase()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("projects.currentMode")}</span>
              <span className="font-medium">{t("projects.currentModeValue")}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{t("projects.bestUse")}</p>
              <p className="mt-2 font-medium">{t("projects.bestUseCopy")}</p>
            </div>
          </div>
        )}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("projects.loading")}</p>
          ) : query.isError ? (
            <ErrorState title={t("projects.unavailable")} description={t("projects.unavailableDescription")} />
          ) : query.data && query.data.length > 0 ? (
            query.data.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      <Link className="hover:underline" href={`/projects/${project.id}`}>
                        {project.name}
                      </Link>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{project.elevatorPitch || t("projects.noPitchYet")}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/55 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                    {project.stage.replaceAll("_", " ")}
                  </span>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("projects.competition")}</p>
                    <p className="mt-1 text-lg font-semibold">{project.analysis?.competitionCount ?? t("common.na")}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("projects.avgReview")}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {project.analysis?.averageReviewScore ? formatPercent(project.analysis.averageReviewScore, 1) : t("common.na")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("projects.medianRevenue")}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {project.analysis?.medianRevenueCents ? formatCurrency(project.analysis.medianRevenueCents) : t("common.na")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.noProjectsYet")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("projects.noProjectsYetCopy")}
              </CardContent>
            </Card>
          )}
        </div>
        <Card className="h-fit overflow-hidden">
          <div className="pointer-events-none h-px w-full shimmer-divider opacity-70" />
          <CardHeader>
            <CardTitle>{t("projects.createProject")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5">
            <div className="space-y-2">
              <Label htmlFor="project-name">{t("projects.projectName")}</Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={t("projects.projectName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-pitch">{t("projects.elevatorPitch")}</Label>
              <Textarea
                id="project-pitch"
                value={form.elevatorPitch}
                onChange={(event) => setForm((current) => ({ ...current, elevatorPitch: event.target.value }))}
                placeholder={t("projects.elevatorPitch")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">{t("projects.projectDescription")}</Label>
              <Textarea
                id="project-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder={t("projects.projectDescription")}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-genres">{t("projects.genres")}</Label>
                <Input
                  id="project-genres"
                  value={form.genreInput}
                  onChange={(event) => setForm((current) => ({ ...current, genreInput: event.target.value }))}
                  placeholder="strategy, rpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-tags">{t("projects.tags")}</Label>
                <Input
                  id="project-tags"
                  value={form.tagInput}
                  onChange={(event) => setForm((current) => ({ ...current, tagInput: event.target.value }))}
                  placeholder="deckbuilder, co-op"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-monetization">{t("projects.monetization")}</Label>
                <Input
                  id="project-monetization"
                  value={form.monetizationModel}
                  onChange={(event) => setForm((current) => ({ ...current, monetizationModel: event.target.value }))}
                  placeholder="premium, free-to-play"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-price">{t("projects.priceTargetCents")}</Label>
                <Input
                  id="project-price"
                  value={form.pricePointCents}
                  onChange={(event) => setForm((current) => ({ ...current, pricePointCents: event.target.value }))}
                  placeholder="2499"
                />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button disabled={isSubmitting} onClick={createProject}>
              {isSubmitting ? t("projects.creating") : t("projects.createProject")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
