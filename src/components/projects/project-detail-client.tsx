"use client";

import { useEffect, useMemo, useState } from "react";

import { ErrorState } from "@/components/error-state";
import { ExportActions } from "@/components/export/export-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/features/projects/hooks";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const stageOptions = [
  "DISCOVERY",
  "PRE_PRODUCTION",
  "PRODUCTION",
  "LIVE",
  "ARCHIVED"
] as const;

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const query = useProject(projectId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingGdd, setIsGeneratingGdd] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    elevatorPitch: "",
    description: "",
    genreInput: "",
    tagInput: "",
    targetAudience: "",
    coreLoop: "",
    differentiator: "",
    monetizationModel: "",
    artDirection: "",
    playerFantasy: "",
    pricePointCents: "",
    stage: "DISCOVERY"
  });
  const [newColumn, setNewColumn] = useState({ name: "", color: "" });
  const [newCards, setNewCards] = useState<Record<string, {
    title: string;
    description: string;
    assigneeLabel: string;
    dueDate: string;
    labels: string;
  }>>({});
  const [columnEdits, setColumnEdits] = useState<Record<string, { name: string; color: string }>>({});
  const [cardEdits, setCardEdits] = useState<Record<string, {
    title: string;
    description: string;
    assigneeLabel: string;
    dueDate: string;
    labels: string;
  }>>({});

  useEffect(() => {
    if (!query.data) {
      return;
    }

    setProjectForm({
      name: query.data.name,
      elevatorPitch: query.data.elevatorPitch ?? "",
      description: query.data.description ?? "",
      genreInput: query.data.genreInput ?? "",
      tagInput: query.data.tagInput ?? "",
      targetAudience: query.data.targetAudience ?? "",
      coreLoop: query.data.coreLoop ?? "",
      differentiator: query.data.differentiator ?? "",
      monetizationModel: query.data.monetizationModel ?? "",
      artDirection: query.data.artDirection ?? "",
      playerFantasy: query.data.playerFantasy ?? "",
      pricePointCents: query.data.pricePointCents ? String(query.data.pricePointCents) : "",
      stage: query.data.stage
    });

    const nextColumnEdits: Record<string, { name: string; color: string }> = {};

    for (const boardItem of query.data.kanbanBoards) {
      for (const column of boardItem.columns) {
        nextColumnEdits[column.id] = {
          name: column.name,
          color: column.color ?? ""
        };
      }
    }

    setColumnEdits(nextColumnEdits);

    const nextCardEdits: Record<string, {
      title: string;
      description: string;
      assigneeLabel: string;
      dueDate: string;
      labels: string;
    }> = {};

    for (const boardItem of query.data.kanbanBoards) {
      for (const column of boardItem.columns) {
        for (const card of column.cards) {
          nextCardEdits[card.id] = {
            title: card.title,
            description: card.description ?? "",
            assigneeLabel: card.assigneeLabel ?? "",
            dueDate: card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : "",
            labels: Array.isArray(card.labels) ? card.labels.join(", ") : ""
          };
        }
      }
    }

    setCardEdits(nextCardEdits);
  }, [query.data]);

  const board = query.data?.kanbanBoards[0] ?? null;
  const columnOptions = useMemo(
    () => board?.columns.map((column) => ({ id: column.id, name: column.name })) ?? [],
    [board]
  );
  const latestGdd = query.data?.gdds[0] ?? null;

  async function saveProject() {
    setFeedback(null);
    setIsSaving(true);

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...projectForm,
        pricePointCents: projectForm.pricePointCents ? Number(projectForm.pricePointCents) : null
      })
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to save project.");
      return;
    }

    setFeedback("Project saved.");
    await query.refetch();
  }

  async function runAnalysis() {
    setFeedback(null);
    setIsAnalyzing(true);

    const response = await fetch(`/api/projects/${projectId}/analysis`, {
      method: "POST"
    });

    setIsAnalyzing(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to analyze project.");
      return;
    }

    setFeedback("Market analysis updated.");
    await query.refetch();
  }

  async function generateGdd() {
    setFeedback(null);
    setIsGeneratingGdd(true);

    const response = await fetch(`/api/projects/${projectId}/gdd`, {
      method: "POST"
    });

    setIsGeneratingGdd(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to generate GDD.");
      return;
    }

    setFeedback("GDD generated.");
    await query.refetch();
  }

  async function createColumn() {
    setFeedback(null);

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "createColumn",
        name: newColumn.name,
        color: newColumn.color
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to create column.");
      return;
    }

    setNewColumn({ name: "", color: "" });
    setFeedback("Column created.");
    await query.refetch();
  }

  async function updateColumn(columnId: string, name: string, color: string | null, sortOrder: number) {
    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "updateColumn",
        columnId,
        name,
        color,
        sortOrder
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to update column.");
      return;
    }

    setFeedback("Column updated.");
    await query.refetch();
  }

  async function createCard(columnId: string) {
    const cardState = newCards[columnId];

    if (!cardState?.title?.trim()) {
      setFeedback("Card title is required.");
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "createCard",
        columnId,
        title: cardState.title,
        description: cardState.description,
        assigneeLabel: cardState.assigneeLabel,
        dueDate: cardState.dueDate ? new Date(cardState.dueDate).toISOString() : undefined,
        labels: cardState.labels
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to create card.");
      return;
    }

    setNewCards((current) => ({
      ...current,
      [columnId]: {
        title: "",
        description: "",
        assigneeLabel: "",
        dueDate: "",
        labels: ""
      }
    }));
    setFeedback("Card created.");
    await query.refetch();
  }

  async function saveCard(cardId: string) {
    const cardState = cardEdits[cardId];

    if (!cardState?.title.trim()) {
      setFeedback("Card title is required.");
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "updateCard",
        cardId,
        title: cardState.title,
        description: cardState.description,
        assigneeLabel: cardState.assigneeLabel,
        dueDate: cardState.dueDate ? new Date(cardState.dueDate).toISOString() : null,
        labels: cardState.labels
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to save card.");
      return;
    }

    setFeedback("Card updated.");
    await query.refetch();
  }

  async function moveCard(cardId: string, columnId: string) {
    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "updateCard",
        cardId,
        columnId
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to move card.");
      return;
    }

    await query.refetch();
  }

  async function moveCardInColumn(cardId: string, direction: "up" | "down") {
    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "moveCard",
        cardId,
        direction
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to move card.");
      return;
    }

    await query.refetch();
  }

  async function deleteCard(cardId: string) {
    const confirmed = window.confirm("Delete this card permanently?");

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "deleteCard",
        cardId
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to delete card.");
      return;
    }

    setFeedback("Card deleted.");
    await query.refetch();
  }

  async function moveColumn(columnId: string, direction: "left" | "right") {
    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "moveColumn",
        columnId,
        direction
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to move column.");
      return;
    }

    await query.refetch();
  }

  async function deleteColumn(columnId: string) {
    const confirmed = window.confirm("Delete this column and all cards inside it?");

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/projects/${projectId}/kanban`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "deleteColumn",
        columnId
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "Unable to delete column.");
      return;
    }

    setFeedback("Column deleted.");
    await query.refetch();
  }

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading project...</p>;
  }

  if (query.isError || !query.data) {
    return <ErrorState title="Project unavailable" description="We could not load this project." />;
  }

  const project = query.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {project.elevatorPitch || "Build the thesis, connect it to the market, and turn it into execution."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={isAnalyzing} onClick={runAnalysis}>
            {isAnalyzing ? "Analyzing..." : "Run market analysis"}
          </Button>
          <Button disabled={isGeneratingGdd} variant="outline" onClick={generateGdd}>
            {isGeneratingGdd ? "Generating..." : "Generate GDD"}
          </Button>
          <ExportActions
            label="Export project"
            xlsxHref={`/api/exports/projects/${projectId}?format=xlsx`}
            csvHref={`/api/exports/projects/${projectId}?format=csv`}
            googleSheetsEndpoint={`/api/exports/projects/${projectId}`}
          />
        </div>
      </div>
      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="market">Market analysis</TabsTrigger>
          <TabsTrigger value="gdd">GDD</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project definition</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-name">Project name</Label>
                <Input id="detail-name" value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-pitch">Elevator pitch</Label>
                <Textarea id="detail-pitch" value={projectForm.elevatorPitch} onChange={(event) => setProjectForm((current) => ({ ...current, elevatorPitch: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="detail-description">Description</Label>
                <Textarea id="detail-description" value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-genres">Genres</Label>
                <Input id="detail-genres" value={projectForm.genreInput} onChange={(event) => setProjectForm((current) => ({ ...current, genreInput: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-tags">Tags</Label>
                <Input id="detail-tags" value={projectForm.tagInput} onChange={(event) => setProjectForm((current) => ({ ...current, tagInput: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-audience">Target audience</Label>
                <Textarea id="detail-audience" value={projectForm.targetAudience} onChange={(event) => setProjectForm((current) => ({ ...current, targetAudience: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-core-loop">Core loop</Label>
                <Textarea id="detail-core-loop" value={projectForm.coreLoop} onChange={(event) => setProjectForm((current) => ({ ...current, coreLoop: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-differentiator">Differentiator</Label>
                <Textarea id="detail-differentiator" value={projectForm.differentiator} onChange={(event) => setProjectForm((current) => ({ ...current, differentiator: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-fantasy">Player fantasy</Label>
                <Textarea id="detail-fantasy" value={projectForm.playerFantasy} onChange={(event) => setProjectForm((current) => ({ ...current, playerFantasy: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-monetization">Monetization</Label>
                <Input id="detail-monetization" value={projectForm.monetizationModel} onChange={(event) => setProjectForm((current) => ({ ...current, monetizationModel: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-art">Art direction</Label>
                <Input id="detail-art" value={projectForm.artDirection} onChange={(event) => setProjectForm((current) => ({ ...current, artDirection: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-price">Price target (cents)</Label>
                <Input id="detail-price" value={projectForm.pricePointCents} onChange={(event) => setProjectForm((current) => ({ ...current, pricePointCents: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={projectForm.stage} onValueChange={(value) => setProjectForm((current) => ({ ...current, stage: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button disabled={isSaving} onClick={saveProject}>
                  {isSaving ? "Saving..." : "Save project"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="market" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competition</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(project.analysis?.competitionCount ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Avg review</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatPercent(project.analysis?.averageReviewScore ?? null, 1)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Median revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(project.analysis?.medianRevenueCents ?? null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Launch momentum</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatNumber(project.analysis?.releaseMomentum ?? null)}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Integrated market analysis</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p>{project.analysis?.marketSummary ?? "Run market analysis to populate this section."}</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Opportunity</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.opportunitySummary ?? "Pending analysis."}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Risk</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.riskSummary ?? "Pending analysis."}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Autofill audience</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.audienceAutofill ?? "Pending analysis."}</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Autofill core loop</p>
                  <p className="mt-2 text-muted-foreground">{project.analysis?.coreLoopAutofill ?? "Pending analysis."}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Suggested genres</p>
                  <p className="mt-2 text-muted-foreground">
                    {project.analysis?.suggestedGenres?.join(", ") || "Pending analysis."}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium">Suggested tags</p>
                  <p className="mt-2 text-muted-foreground">
                    {project.analysis?.suggestedTags?.join(", ") || "Pending analysis."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Comparable Steam games</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {project.competitorGames.length > 0 ? project.competitorGames.map((item) => (
                <div key={item.steamGame.id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium">{item.steamGame.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Reviews: {formatNumber(item.steamGame.reviewCount)} · Score: {formatPercent(item.steamGame.reviewScore ?? null, 1)}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatCurrency(item.steamGame.revenueEstimates[0]?.medianNetRevenueCents ?? null)}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No comparable set attached yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="gdd" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Automated GDD</CardTitle>
              <Button disabled={isGeneratingGdd} onClick={generateGdd}>
                {isGeneratingGdd ? "Generating..." : latestGdd ? "Regenerate" : "Generate GDD"}
              </Button>
            </CardHeader>
            <CardContent>
              {latestGdd ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {latestGdd.title} · Updated {new Date(latestGdd.updatedAt).toLocaleString()}
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border bg-muted/30 p-4 text-sm">
                    {latestGdd.content}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Generate the first GDD from the current project and market analysis.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="kanban" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customize board</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_120px]">
              <Input
                value={newColumn.name}
                onChange={(event) => setNewColumn((current) => ({ ...current, name: event.target.value }))}
                placeholder="New column name"
              />
              <Input
                value={newColumn.color}
                onChange={(event) => setNewColumn((current) => ({ ...current, color: event.target.value }))}
                placeholder="#0ea5e9"
              />
              <Button onClick={createColumn}>Add column</Button>
            </CardContent>
          </Card>
          <div className="grid gap-4 xl:grid-cols-4">
            {board?.columns.map((column, index) => (
              <Card key={column.id} className="h-fit">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: column.color || "#64748b" }} />
                    <Input
                      value={columnEdits[column.id]?.name ?? column.name}
                      onChange={(event) => setColumnEdits((current) => ({
                        ...current,
                        [column.id]: {
                          name: event.target.value,
                          color: current[column.id]?.color ?? column.color ?? ""
                        }
                      }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={columnEdits[column.id]?.color ?? column.color ?? ""}
                      onChange={(event) => setColumnEdits((current) => ({
                        ...current,
                        [column.id]: {
                          name: current[column.id]?.name ?? column.name,
                          color: event.target.value
                        }
                      }))}
                      placeholder="#64748b"
                    />
                    <Button
                      variant="outline"
                      onClick={() => updateColumn(
                        column.id,
                        columnEdits[column.id]?.name ?? column.name,
                        columnEdits[column.id]?.color ?? column.color,
                        index
                      )}
                    >
                      Save
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => moveColumn(column.id, "left")}>
                      ←
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => moveColumn(column.id, "right")}>
                      →
                    </Button>
                    <Button size="sm" type="button" variant="destructive" onClick={() => deleteColumn(column.id)}>
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {column.cards.map((card) => (
                    <div key={card.id} className="rounded-2xl border bg-muted/20 p-3">
                      <div className="grid gap-3">
                        <Input
                          value={cardEdits[card.id]?.title ?? card.title}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: event.target.value,
                              description: current[card.id]?.description ?? card.description ?? "",
                              assigneeLabel: current[card.id]?.assigneeLabel ?? card.assigneeLabel ?? "",
                              dueDate: current[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""),
                              labels: current[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")
                            }
                          }))}
                        />
                        <Textarea
                          value={cardEdits[card.id]?.description ?? card.description ?? ""}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: current[card.id]?.title ?? card.title,
                              description: event.target.value,
                              assigneeLabel: current[card.id]?.assigneeLabel ?? card.assigneeLabel ?? "",
                              dueDate: current[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""),
                              labels: current[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")
                            }
                          }))}
                          placeholder="Description"
                        />
                        <Input
                          value={cardEdits[card.id]?.assigneeLabel ?? card.assigneeLabel ?? ""}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: current[card.id]?.title ?? card.title,
                              description: current[card.id]?.description ?? card.description ?? "",
                              assigneeLabel: event.target.value,
                              dueDate: current[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""),
                              labels: current[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")
                            }
                          }))}
                          placeholder="Owner"
                        />
                        <Input
                          type="date"
                          value={cardEdits[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : "")}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: current[card.id]?.title ?? card.title,
                              description: current[card.id]?.description ?? card.description ?? "",
                              assigneeLabel: current[card.id]?.assigneeLabel ?? card.assigneeLabel ?? "",
                              dueDate: event.target.value,
                              labels: current[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")
                            }
                          }))}
                        />
                        <Input
                          value={cardEdits[card.id]?.labels ?? (Array.isArray(card.labels) ? card.labels.join(", ") : "")}
                          onChange={(event) => setCardEdits((current) => ({
                            ...current,
                            [card.id]: {
                              title: current[card.id]?.title ?? card.title,
                              description: current[card.id]?.description ?? card.description ?? "",
                              assigneeLabel: current[card.id]?.assigneeLabel ?? card.assigneeLabel ?? "",
                              dueDate: current[card.id]?.dueDate ?? (card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""),
                              labels: event.target.value
                            }
                          }))}
                          placeholder="labels, comma, separated"
                        />
                        <Select value={column.id} onValueChange={(value) => moveCard(card.id, value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columnOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" type="button" variant="outline" onClick={() => moveCardInColumn(card.id, "up")}>
                            ↑
                          </Button>
                          <Button size="sm" type="button" variant="outline" onClick={() => moveCardInColumn(card.id, "down")}>
                            ↓
                          </Button>
                          <Button size="sm" type="button" variant="outline" onClick={() => saveCard(card.id)}>
                            Save card
                          </Button>
                          <Button size="sm" type="button" variant="destructive" onClick={() => deleteCard(card.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-dashed p-3">
                    <div className="grid gap-2">
                      <Input
                        value={newCards[column.id]?.title ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: event.target.value,
                            description: current[column.id]?.description ?? "",
                            assigneeLabel: current[column.id]?.assigneeLabel ?? "",
                            dueDate: current[column.id]?.dueDate ?? "",
                            labels: current[column.id]?.labels ?? ""
                          }
                        }))}
                        placeholder="New card title"
                      />
                      <Textarea
                        value={newCards[column.id]?.description ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: current[column.id]?.title ?? "",
                            description: event.target.value,
                            assigneeLabel: current[column.id]?.assigneeLabel ?? "",
                            dueDate: current[column.id]?.dueDate ?? "",
                            labels: current[column.id]?.labels ?? ""
                          }
                        }))}
                        placeholder="Card description"
                      />
                      <Input
                        value={newCards[column.id]?.assigneeLabel ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: current[column.id]?.title ?? "",
                            description: current[column.id]?.description ?? "",
                            assigneeLabel: event.target.value,
                            dueDate: current[column.id]?.dueDate ?? "",
                            labels: current[column.id]?.labels ?? ""
                          }
                        }))}
                        placeholder="Owner"
                      />
                      <Input
                        type="date"
                        value={newCards[column.id]?.dueDate ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: current[column.id]?.title ?? "",
                            description: current[column.id]?.description ?? "",
                            assigneeLabel: current[column.id]?.assigneeLabel ?? "",
                            dueDate: event.target.value,
                            labels: current[column.id]?.labels ?? ""
                          }
                        }))}
                      />
                      <Input
                        value={newCards[column.id]?.labels ?? ""}
                        onChange={(event) => setNewCards((current) => ({
                          ...current,
                          [column.id]: {
                            title: current[column.id]?.title ?? "",
                            description: current[column.id]?.description ?? "",
                            assigneeLabel: current[column.id]?.assigneeLabel ?? "",
                            dueDate: current[column.id]?.dueDate ?? "",
                            labels: event.target.value
                          }
                        }))}
                        placeholder="labels, comma, separated"
                      />
                      <Button variant="outline" onClick={() => createCard(column.id)}>
                        Add card
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
