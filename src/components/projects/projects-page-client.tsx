"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      setError(payload?.message ?? "Unable to create project.");
      return;
    }

    const project = (await response.json()) as { id: string };
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a game thesis, run market analysis, generate a GDD, and manage execution from one place.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          ) : query.isError ? (
            <ErrorState title="Projects unavailable" description="We could not load your project portfolio." />
          ) : query.data && query.data.length > 0 ? (
            query.data.map((project) => (
              <Card key={project.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">
                      <Link className="hover:underline" href={`/projects/${project.id}`}>
                        {project.name}
                      </Link>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{project.elevatorPitch || "No pitch yet."}</p>
                  </div>
                  <span className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {project.stage.replaceAll("_", " ")}
                  </span>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Competition</p>
                    <p className="mt-1 text-lg font-semibold">{project.analysis?.competitionCount ?? "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg review</p>
                    <p className="mt-1 text-lg font-semibold">
                      {project.analysis?.averageReviewScore ? formatPercent(project.analysis.averageReviewScore, 1) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Median revenue</p>
                    <p className="mt-1 text-lg font-semibold">
                      {project.analysis?.medianRevenueCents ? formatCurrency(project.analysis.medianRevenueCents) : "N/A"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No projects yet</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Start with one concept, then let Neolytics connect it to the Steam market and execution plan.
              </CardContent>
            </Card>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create project</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Project Atlas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-pitch">Elevator pitch</Label>
              <Textarea
                id="project-pitch"
                value={form.elevatorPitch}
                onChange={(event) => setForm((current) => ({ ...current, elevatorPitch: event.target.value }))}
                placeholder="A co-op extraction tactics game for players who want..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Project description</Label>
              <Textarea
                id="project-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short concept, scope, and intended player experience."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-genres">Genres</Label>
                <Input
                  id="project-genres"
                  value={form.genreInput}
                  onChange={(event) => setForm((current) => ({ ...current, genreInput: event.target.value }))}
                  placeholder="strategy, rpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-tags">Tags</Label>
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
                <Label htmlFor="project-monetization">Monetization</Label>
                <Input
                  id="project-monetization"
                  value={form.monetizationModel}
                  onChange={(event) => setForm((current) => ({ ...current, monetizationModel: event.target.value }))}
                  placeholder="premium, free-to-play"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-price">Price target (cents)</Label>
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
              {isSubmitting ? "Creating..." : "Create project"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
