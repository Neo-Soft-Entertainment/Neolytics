"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { PageHero } from "@/components/app-shell/page-hero";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProjects, type ProjectListItem } from "@/features/projects/hooks";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function ProjectsPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
    const temporaryId = `optimistic-project:${Date.now()}`;
    const previousProjects = queryClient.getQueryData<ProjectListItem[]>(["projects"]);

        let resolvedValue0: any;
    if (form.pricePointCents) {
      resolvedValue0 = Number(form.pricePointCents);
    } else {
      resolvedValue0 = null;
    }
    const optimisticProject = {
      id: temporaryId,
      name: form.name.trim(),
      slug: temporaryId,
      elevatorPitch: form.elevatorPitch.trim() || null,
      stage: "DISCOVERY",
      createdAt: new Date().toISOString(),
      analysis: null,
      gdds: [],
      optimistic: true
    } as ProjectListItem & { optimistic: boolean };

    queryClient.setQueryData<ProjectListItem[]>(["projects"], (current: any) => {
      if (!current) {
        return [optimisticProject];
      }

      return [optimisticProject, ...current];
    });

    let response: Response;

    try {
      response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          pricePointCents: resolvedValue0
        })
      });
    } catch {
      queryClient.setQueryData(["projects"], previousProjects);
      setError(t("projects.createProjectError"));
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      queryClient.setQueryData(["projects"], previousProjects);
      setError(payload?.message ?? t("projects.createProjectError"));
      setIsSubmitting(false);
      return;
    }

    const project = (await response.json()) as ProjectListItem;
    queryClient.setQueryData<ProjectListItem[]>(["projects"], (current: any) => {
      if (!current) {
        return [project];
      }

      return current.map((item: any) => {
        if (item.id === temporaryId) {
          return project;
        }

        return item;
      });
    });
    setIsSubmitting(false);
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    router.push(`/projects/${project.id}`);
  }

    let resolvedValue1: any;
  if (query.isLoading) {
    resolvedValue1 = (
            <p className="text-sm text-muted-foreground">{t("projects.loading")}</p>
          );
  } else {
        let resolvedValue4: any;
    if (query.isError) {
      resolvedValue4 = (
            <ErrorState title={t("projects.unavailable")} description={t("projects.unavailableDescription")} />
          );
    } else {
            let resolvedValue5: any;
      if (query.data && query.data.length > 0) {
        resolvedValue5 = (
            query.data.map((project) => {
              const isOptimistic = Boolean((project as any).optimistic);
              let projectTitle: any;
              if (isOptimistic) {
                projectTitle = (
                  <span className="text-muted-foreground">{project.name}</span>
                );
              } else {
                projectTitle = (
                  <Link className="hover:underline" href={`/projects/${project.id}`}>
                    {project.name}
                  </Link>
                );
              }
              let resolvedValue6: any;
              if (project.analysis?.averageReviewScore) {
                resolvedValue6 = formatPercent(project.analysis.averageReviewScore, 1);
              } else {
                resolvedValue6 = t("common.na");
              }
              let resolvedValue7: any;
              if (project.analysis?.medianRevenueCents) {
                resolvedValue7 = formatCurrency(project.analysis.medianRevenueCents);
              } else {
                resolvedValue7 = t("common.na");
              }
              return (
              <Card key={project.id} className="overflow-hidden">
                <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {projectTitle}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{project.elevatorPitch || t("projects.noPitchYet")}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/55 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                    {(project.stage ?? "DISCOVERY").replaceAll("_", " ")}
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
                      {resolvedValue6}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/45 p-3 dark:bg-white/[0.03]">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("projects.medianRevenue")}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {resolvedValue7}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
            })
          );
      } else {
        resolvedValue5 = (
            <Card>
              <CardHeader>
                <CardTitle>{t("projects.noProjectsYet")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("projects.noProjectsYetCopy")}
              </CardContent>
            </Card>
          );
      }
resolvedValue4 = resolvedValue5;
    }
resolvedValue1 = resolvedValue4;
  }
  let resolvedValue2: any;
  if (error) {
    resolvedValue2 = <p className="text-sm text-destructive">{error}</p>;
  } else {
    resolvedValue2 = null;
  }
  let resolvedValue3: any;
  if (isSubmitting) {
    resolvedValue3 = t("projects.creating");
  } else {
    resolvedValue3 = t("projects.createProject");
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
          {resolvedValue1}
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
                onChange={(event: any) => setForm((current: any) => ({ ...current, name: event.target.value }))}
                placeholder={t("projects.projectName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-pitch">{t("projects.elevatorPitch")}</Label>
              <Textarea
                id="project-pitch"
                value={form.elevatorPitch}
                onChange={(event: any) => setForm((current: any) => ({ ...current, elevatorPitch: event.target.value }))}
                placeholder={t("projects.elevatorPitch")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">{t("projects.projectDescription")}</Label>
              <Textarea
                id="project-description"
                value={form.description}
                onChange={(event: any) => setForm((current: any) => ({ ...current, description: event.target.value }))}
                placeholder={t("projects.projectDescription")}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-genres">{t("projects.genres")}</Label>
                <Input
                  id="project-genres"
                  value={form.genreInput}
                  onChange={(event: any) => setForm((current: any) => ({ ...current, genreInput: event.target.value }))}
                  placeholder="strategy, rpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-tags">{t("projects.tags")}</Label>
                <Input
                  id="project-tags"
                  value={form.tagInput}
                  onChange={(event: any) => setForm((current: any) => ({ ...current, tagInput: event.target.value }))}
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
                  onChange={(event: any) => setForm((current: any) => ({ ...current, monetizationModel: event.target.value }))}
                  placeholder="premium, free-to-play"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-price">{t("projects.priceTargetCents")}</Label>
                <Input
                  id="project-price"
                  value={form.pricePointCents}
                  onChange={(event: any) => setForm((current: any) => ({ ...current, pricePointCents: event.target.value }))}
                  placeholder="2499"
                />
              </div>
            </div>
            {resolvedValue2}
            <Button disabled={isSubmitting} onClick={createProject}>
              {resolvedValue3}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
