"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, Upload } from "lucide-react";

import { useProjects } from "@/features/projects/hooks";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DemoElementKind = "MECHANIC" | "CHARACTER" | "ITEM" | "LOCATION" | "DIALOGUE" | "QUEST";
type DemoEntityStatus = "IDEA" | "PLANNED" | "IN_DEVELOPMENT" | "IMPLEMENTED" | "TESTING" | "REVIEW" | "CUT" | "DEFERRED";
type DemoPriority = "ESSENTIAL" | "IMPORTANT" | "OPTIONAL" | "POST_DEMO";
type DemoStage =
  | "IDEATION"
  | "INITIAL_ORGANIZATION"
  | "DEMO_DEFINITION"
  | "PLAYABLE_LINE_PLANNING"
  | "FOUNDATION_IMPLEMENTATION"
  | "PLAYABLE_LINE_IMPLEMENTATION"
  | "POLISH"
  | "TESTING"
  | "PLAYABLE_DEMO"
  | "POST_DEMO";
type DemoDependencyEntityType = DemoElementKind | "PLAYABLE_STEP" | "EMOTIONAL_BEAT" | "BUG" | "BLOCKER";
type DemoBugSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type DemoBugStatus = "OPEN" | "IN_REVIEW" | "FIXING" | "RESOLVED" | "IGNORED" | "DEFERRED";

type DemoPlan = {
  id: string;
  demoGoal: string | null;
  demoScope: string | null;
  targetPlatform: string | null;
  targetBuildDate: string | null;
  currentStage: DemoStage;
  progressEstimate: number;
  notes: string | null;
  stageExitCriteria: string | null;
  activeProblems: string | null;
};

type DemoElement = {
  id: string;
  kind: DemoElementKind;
  name: string;
  description: string | null;
  status: DemoEntityStatus;
  priority: DemoPriority;
  tags: string[];
  notes: string | null;
};

type PlayableStep = {
  id: string;
  sortOrder: number;
  title: string;
  description: string | null;
  playerAction: string | null;
  playerObjective: string | null;
  expectedResult: string | null;
  relatedLocationId: string | null;
  relatedCharacterIds: string[];
  relatedItemIds: string[];
  relatedMechanicIds: string[];
  relatedQuestIds: string[];
  relatedDialogueIds: string[];
  status: DemoEntityStatus;
  priority: DemoPriority;
  notes: string | null;
};

type EmotionalBeat = {
  id: string;
  sortOrder: number;
  playableStepId: string | null;
  momentName: string;
  desiredEmotion: string;
  intensity: number;
  triggerElements: string[];
  notes: string | null;
};

type DemoDependency = {
  id: string;
  sourceType: DemoDependencyEntityType;
  sourceId: string;
  targetType: DemoDependencyEntityType;
  targetId: string;
  dependencyType: string;
  description: string | null;
  isCritical: boolean;
};

type DemoBug = {
  id: string;
  title: string;
  description: string | null;
  severity: DemoBugSeverity;
  status: DemoBugStatus;
  affectedEntityType: DemoDependencyEntityType | null;
  affectedEntityId: string | null;
  affectedPlayableStepId: string | null;
};

type DemoBlocker = {
  id: string;
  title: string;
  description: string | null;
  blockedEntityType: DemoDependencyEntityType | null;
  blockedEntityId: string | null;
  cause: string | null;
  possibleSolution: string | null;
  status: DemoBugStatus;
  priority: DemoPriority;
};

type DemoManagerData = {
  plan: DemoPlan;
  elements: DemoElement[];
  playableSteps: PlayableStep[];
  emotionalBeats: EmotionalBeat[];
  dependencies: DemoDependency[];
  bugs: DemoBug[];
  blockers: DemoBlocker[];
  diagnostic: {
    playable: boolean;
    hasPlayableLine: boolean;
    essentialStepsReady: boolean;
    unresolvedCriticalDependencies: number;
    criticalBugs: number;
    activeBlockers: number;
    criticalDependencies: number;
    weakDependencyAlerts: number;
    blockedStepIds: string[];
    nextRecommendedStep: string;
  };
};

const sections = [
  "Overview",
  "Linha Jogável",
  "Linha Emocional",
  "Mecânicas",
  "Personagens",
  "Itens",
  "Locais",
  "Diálogos",
  "Missões",
  "Prioridades",
  "Dependências",
  "Bugs e Bloqueios",
  "Etapa Atual",
  "Exportar / Importar"
] as const;

const statusLabels: Record<DemoEntityStatus, string> = {
  IDEA: "Ideia",
  PLANNED: "Planejado",
  IN_DEVELOPMENT: "Em desenvolvimento",
  IMPLEMENTED: "Implementado",
  TESTING: "Testando",
  REVIEW: "Revisar",
  CUT: "Cortado",
  DEFERRED: "Adiado"
};

const priorityLabels: Record<DemoPriority, string> = {
  ESSENTIAL: "Essencial para a demo",
  IMPORTANT: "Importante",
  OPTIONAL: "Opcional",
  POST_DEMO: "Pós-demo"
};

const stageLabels: Record<DemoStage, string> = {
  IDEATION: "Ideação",
  INITIAL_ORGANIZATION: "Organização inicial",
  DEMO_DEFINITION: "Definição da demo",
  PLAYABLE_LINE_PLANNING: "Planejamento da linha jogável",
  FOUNDATION_IMPLEMENTATION: "Implementação das bases",
  PLAYABLE_LINE_IMPLEMENTATION: "Implementação da linha jogável",
  POLISH: "Polimento",
  TESTING: "Testes",
  PLAYABLE_DEMO: "Demo jogável",
  POST_DEMO: "Pós-demo"
};

const kindBySection: Partial<Record<(typeof sections)[number], DemoElementKind>> = {
  Mecânicas: "MECHANIC",
  Personagens: "CHARACTER",
  Itens: "ITEM",
  Locais: "LOCATION",
  Diálogos: "DIALOGUE",
  Missões: "QUEST"
};

const kindLabels: Record<DemoElementKind, string> = {
  MECHANIC: "Mecânicas",
  CHARACTER: "Personagens",
  ITEM: "Itens",
  LOCATION: "Locais",
  DIALOGUE: "Diálogos",
  QUEST: "Missões"
};

const emotionOptions = ["Curiosidade", "Tensão", "Alívio", "Descoberta", "Confiança", "Surpresa", "Medo", "Empolgação", "Conquista", "Dúvida"];
const bugSeverityLabels: Record<DemoBugSeverity, string> = { CRITICAL: "Crítico", HIGH: "Alto", MEDIUM: "Médio", LOW: "Baixo" };
const bugStatusLabels: Record<DemoBugStatus, string> = {
  OPEN: "Aberto",
  IN_REVIEW: "Em análise",
  FIXING: "Em correção",
  RESOLVED: "Resolvido",
  IGNORED: "Ignorado",
  DEFERRED: "Adiado"
};

export function DemoManagerPageClient({
  projectId: fixedProjectId,
  sections: visibleSections = sections,
  showHeader = true
}: {
  projectId?: string;
  sections?: readonly (typeof sections)[number][];
  showHeader?: boolean;
}) {
  const projects = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [section, setSection] = useState<(typeof sections)[number]>(visibleSections[0] ?? "Overview");
  const queryClient = useQueryClient();
  const projectId = fixedProjectId ?? selectedProjectId;

  useEffect(() => {
    if (!fixedProjectId && !selectedProjectId && projects.data?.[0]?.id) {
      setSelectedProjectId(projects.data[0].id);
    }
  }, [fixedProjectId, selectedProjectId, projects.data]);

  useEffect(() => {
    if (!visibleSections.includes(section)) {
      setSection(visibleSections[0] ?? "Overview");
    }
  }, [section, visibleSections]);

  const dataQuery = useQuery({
    queryKey: ["demo-manager", projectId],
    queryFn: () => apiClient<DemoManagerData>(`/api/projects/${projectId}/demo-manager`),
    enabled: Boolean(projectId)
  });

  const mutation = useMutation({
    mutationFn: async ({ path, method, body }: { path: string; method: string; body?: unknown }) =>
      apiClient(path, {
        method,
        body: body ? JSON.stringify(body) : undefined
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["demo-manager", projectId] });
    }
  });

  const rawData = dataQuery.data as Partial<DemoManagerData> | undefined;
  const data: DemoManagerData | null = rawData ? {
    plan: {
      id: rawData.plan?.id ?? "",
      demoGoal: rawData.plan?.demoGoal ?? null,
      demoScope: rawData.plan?.demoScope ?? null,
      targetPlatform: rawData.plan?.targetPlatform ?? null,
      targetBuildDate: rawData.plan?.targetBuildDate ?? null,
      currentStage: rawData.plan?.currentStage ?? "IDEATION",
      progressEstimate: rawData.plan?.progressEstimate ?? 0,
      notes: rawData.plan?.notes ?? null,
      stageExitCriteria: rawData.plan?.stageExitCriteria ?? null,
      activeProblems: rawData.plan?.activeProblems ?? null
    },
    elements: Array.isArray(rawData.elements) ? rawData.elements.filter((item): item is DemoElement => Boolean(item)).map((item) => ({ ...item, tags: Array.isArray(item.tags) ? item.tags : [] })) : [],
    playableSteps: Array.isArray(rawData.playableSteps) ? rawData.playableSteps.filter((item): item is PlayableStep => Boolean(item)).map((item) => ({
      ...item,
      relatedCharacterIds: Array.isArray(item.relatedCharacterIds) ? item.relatedCharacterIds : [],
      relatedItemIds: Array.isArray(item.relatedItemIds) ? item.relatedItemIds : [],
      relatedMechanicIds: Array.isArray(item.relatedMechanicIds) ? item.relatedMechanicIds : [],
      relatedQuestIds: Array.isArray(item.relatedQuestIds) ? item.relatedQuestIds : [],
      relatedDialogueIds: Array.isArray(item.relatedDialogueIds) ? item.relatedDialogueIds : []
    })) : [],
    emotionalBeats: Array.isArray(rawData.emotionalBeats) ? rawData.emotionalBeats.filter((item): item is EmotionalBeat => Boolean(item)).map((item) => ({
      ...item,
      triggerElements: Array.isArray(item.triggerElements) ? item.triggerElements : []
    })) : [],
    dependencies: Array.isArray(rawData.dependencies) ? rawData.dependencies.filter((item): item is DemoDependency => Boolean(item)) : [],
    bugs: Array.isArray(rawData.bugs) ? rawData.bugs.filter((item): item is DemoBug => Boolean(item)) : [],
    blockers: Array.isArray(rawData.blockers) ? rawData.blockers.filter((item): item is DemoBlocker => Boolean(item)) : [],
    diagnostic: {
      playable: Boolean(rawData.diagnostic?.playable),
      hasPlayableLine: Boolean(rawData.diagnostic?.hasPlayableLine),
      essentialStepsReady: Boolean(rawData.diagnostic?.essentialStepsReady),
      unresolvedCriticalDependencies: rawData.diagnostic?.unresolvedCriticalDependencies ?? 0,
      criticalBugs: rawData.diagnostic?.criticalBugs ?? 0,
      activeBlockers: rawData.diagnostic?.activeBlockers ?? 0,
      criticalDependencies: rawData.diagnostic?.criticalDependencies ?? 0,
      weakDependencyAlerts: rawData.diagnostic?.weakDependencyAlerts ?? 0,
      blockedStepIds: Array.isArray(rawData.diagnostic?.blockedStepIds) ? rawData.diagnostic.blockedStepIds : [],
      nextRecommendedStep: rawData.diagnostic?.nextRecommendedStep ?? "Defina o objetivo da demo e os primeiros itens essenciais."
    }
  } : null;

  if (!fixedProjectId && projects.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando projetos...</div>;
  }

  if (!fixedProjectId && !projects.data?.length) {
    return <div className="p-6 text-sm text-muted-foreground">Crie um projeto antes de usar o Demo Manager.</div>;
  }

  return (
    <div className={cn("flex w-full flex-col gap-6", showHeader && "mx-auto max-w-7xl p-4 sm:p-6")}>
      {showHeader && (
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-card/80 p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-500">Demo Manager</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">Transforme a ideia em demo jogável</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Organize escopo essencial, linha jogável, emoções, dependências, bugs e bloqueios do projeto ativo.
            </p>
          </div>
          {!fixedProjectId && (
            <label className="grid gap-2 text-sm font-medium">
              Projeto
              <select
                className="h-10 min-w-64 rounded-xl border border-border bg-background px-3 text-sm"
                value={projectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                {projects.data?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <div className={cn("grid gap-5", visibleSections.length > 1 && "lg:grid-cols-[220px_1fr]")}>
        {visibleSections.length > 1 && (
          <nav className="flex gap-2 overflow-x-auto rounded-3xl border border-white/10 bg-card/60 p-3 lg:block lg:space-y-2 lg:overflow-visible">
            {visibleSections.map((item) => (
            <button
              key={item}
              className={cn(
                "whitespace-nowrap rounded-2xl px-3 py-2 text-left text-sm transition lg:w-full",
                section === item ? "bg-cyan-500 text-white shadow-sm" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
              )}
              type="button"
              onClick={() => setSection(item)}
            >
              {item}
            </button>
            ))}
          </nav>
        )}

        <main className="min-w-0">
          {dataQuery.isLoading && <div className="rounded-3xl border border-white/10 bg-card/60 p-6 text-sm text-muted-foreground">Carregando Demo Manager...</div>}
          {dataQuery.error && <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-500">Não foi possível carregar o Demo Manager.</div>}
          {data && (
            <>
              {section === "Overview" && <Overview data={data} mutate={mutation.mutate} projectId={projectId} />}
              {section === "Linha Jogável" && <PlayableLine data={data} mutate={mutation.mutate} projectId={projectId} />}
              {section === "Linha Emocional" && <EmotionalLine data={data} mutate={mutation.mutate} projectId={projectId} />}
              {kindBySection[section] && <ElementScreen data={data} kind={kindBySection[section] as DemoElementKind} mutate={mutation.mutate} projectId={projectId} />}
              {section === "Prioridades" && <Priorities data={data} />}
              {section === "Dependências" && <Dependencies data={data} mutate={mutation.mutate} projectId={projectId} />}
              {section === "Bugs e Bloqueios" && <BugsAndBlockers data={data} mutate={mutation.mutate} projectId={projectId} />}
              {section === "Etapa Atual" && <CurrentStage data={data} mutate={mutation.mutate} projectId={projectId} />}
              {section === "Exportar / Importar" && <ExportImport data={data} projectId={projectId} mutate={mutation.mutate} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Overview({ data, mutate, projectId }: { data: DemoManagerData; mutate: MutationFn; projectId: string }) {
  const [form, setForm] = useState({
    demoGoal: data.plan.demoGoal ?? "",
    demoScope: data.plan.demoScope ?? "",
    targetPlatform: data.plan.targetPlatform ?? "",
    targetBuildDate: data.plan.targetBuildDate ? data.plan.targetBuildDate.slice(0, 10) : "",
    progressEstimate: String(data.plan.progressEstimate),
    notes: data.plan.notes ?? ""
  });
  const essentialItems = data.elements.filter((item) => item.priority === "ESSENTIAL").length + data.playableSteps.filter((step) => step.priority === "ESSENTIAL").length;
  const criticalBugs = data.bugs.filter((bug) => bug.severity === "CRITICAL" && ["OPEN", "IN_REVIEW", "FIXING"].includes(bug.status)).length;
  const activeBlockers = data.blockers.filter((blocker) => ["OPEN", "IN_REVIEW", "FIXING"].includes(blocker.status)).length;

  return (
    <div className="grid gap-5">
      <div className={cn("rounded-3xl border p-5", data.diagnostic.playable ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10")}>
        <p className="text-sm font-semibold">{data.diagnostic.playable ? "Demo jogável" : "Demo ainda não jogável"}</p>
        <p className="mt-2 text-sm text-muted-foreground">{data.diagnostic.nextRecommendedStep}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Etapa atual" value={stageLabels[data.plan.currentStage]} />
        <Metric label="Progresso estimado" value={`${data.plan.progressEstimate}%`} />
        <Metric label="Entidades cadastradas" value={String(data.elements.length)} />
        <Metric label="Passos da linha" value={String(data.playableSteps.length)} />
        <Metric label="Itens essenciais" value={String(essentialItems)} />
        <Metric label="Bugs críticos" value={String(criticalBugs)} />
        <Metric label="Bloqueios ativos" value={String(activeBlockers)} />
        <Metric label="Dependências críticas" value={String(data.diagnostic.criticalDependencies)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Objetivo e escopo da demo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input placeholder="Objetivo da demo" value={form.demoGoal} onChange={(event) => setForm({ ...form, demoGoal: event.target.value })} />
          <Textarea placeholder="Escopo essencial" value={form.demoScope} onChange={(event) => setForm({ ...form, demoScope: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Plataforma alvo" value={form.targetPlatform} onChange={(event) => setForm({ ...form, targetPlatform: event.target.value })} />
            <Input type="date" value={form.targetBuildDate} onChange={(event) => setForm({ ...form, targetBuildDate: event.target.value })} />
            <Input type="number" min={0} max={100} value={form.progressEstimate} onChange={(event) => setForm({ ...form, progressEstimate: event.target.value })} />
          </div>
          <Textarea placeholder="Notas" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <Button
            onClick={() =>
              mutate({
                path: `/api/projects/${projectId}/demo-manager`,
                method: "PATCH",
                body: {
                  ...form,
                  targetBuildDate: form.targetBuildDate || null,
                  progressEstimate: Number(form.progressEstimate)
                }
              })
            }
          >
            Salvar overview
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ElementScreen({ data, kind, mutate, projectId }: { data: DemoManagerData; kind: DemoElementKind; mutate: MutationFn; projectId: string }) {
  const [form, setForm] = useState({ name: "", description: "", status: "IDEA" as DemoEntityStatus, priority: "IMPORTANT" as DemoPriority, tags: "", notes: "" });
  const items = data.elements.filter((item) => item.kind === kind);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{kindLabels[kind]}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 rounded-2xl border border-border p-3">
          <Input placeholder="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Textarea placeholder="Descrição" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectEnum value={form.status} options={statusLabels} onChange={(value) => setForm({ ...form, status: value as DemoEntityStatus })} />
            <SelectEnum value={form.priority} options={priorityLabels} onChange={(value) => setForm({ ...form, priority: value as DemoPriority })} />
            <Input placeholder="Tags separadas por vírgula" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
          </div>
          <Textarea placeholder="Notas" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <Button
            onClick={() => {
              mutate({
                path: `/api/projects/${projectId}/demo-manager/elements`,
                method: "POST",
                body: { ...form, kind, tags: toTags(form.tags) }
              });
              setForm({ name: "", description: "", status: "IDEA", priority: "IMPORTANT", tags: "", notes: "" });
            }}
            disabled={!form.name.trim()}
          >
            Criar
          </Button>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              title={item.name}
              subtitle={`${statusLabels[item.status]} · ${priorityLabels[item.priority]}`}
              details={item.description}
              onEdit={() => {
                const name = window.prompt("Nome", item.name);
                if (!name) {
                  return;
                }
                const description = window.prompt("Descrição", item.description ?? "") ?? item.description;
                mutate({ path: `/api/projects/${projectId}/demo-manager/elements/${item.id}`, method: "PATCH", body: { name, description } });
              }}
              onDelete={() => mutate({ path: `/api/projects/${projectId}/demo-manager/elements/${item.id}`, method: "DELETE" })}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <SelectEnum value={item.status} options={statusLabels} onChange={(value) => mutate({ path: `/api/projects/${projectId}/demo-manager/elements/${item.id}`, method: "PATCH", body: { status: value } })} />
                <SelectEnum value={item.priority} options={priorityLabels} onChange={(value) => mutate({ path: `/api/projects/${projectId}/demo-manager/elements/${item.id}`, method: "PATCH", body: { priority: value } })} />
              </div>
            </ItemCard>
          ))}
          {!items.length && <p className="text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PlayableLine({ data, mutate, projectId }: { data: DemoManagerData; mutate: MutationFn; projectId: string }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    playerAction: "",
    playerObjective: "",
    expectedResult: "",
    relatedLocationId: "",
    relatedCharacterIds: [] as string[],
    relatedItemIds: [] as string[],
    relatedMechanicIds: [] as string[],
    relatedQuestIds: [] as string[],
    relatedDialogueIds: [] as string[],
    status: "IDEA" as DemoEntityStatus,
    priority: "ESSENTIAL" as DemoPriority,
    notes: ""
  });
  const blockedIds = new Set(data.diagnostic.blockedStepIds);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha Jogável</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 rounded-2xl border border-border p-3">
          <Input placeholder="Título do passo" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <Textarea placeholder="Descrição" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Ação do jogador" value={form.playerAction} onChange={(event) => setForm({ ...form, playerAction: event.target.value })} />
            <Input placeholder="Objetivo do jogador" value={form.playerObjective} onChange={(event) => setForm({ ...form, playerObjective: event.target.value })} />
            <Input placeholder="Resultado esperado" value={form.expectedResult} onChange={(event) => setForm({ ...form, expectedResult: event.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectEnum value={form.status} options={statusLabels} onChange={(value) => setForm({ ...form, status: value as DemoEntityStatus })} />
            <SelectEnum value={form.priority} options={priorityLabels} onChange={(value) => setForm({ ...form, priority: value as DemoPriority })} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.relatedLocationId} onChange={(event) => setForm({ ...form, relatedLocationId: event.target.value })}>
              <option value="">Local relacionado</option>
              {elementsOf(data, "LOCATION").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <RelationPicker label="Mecânicas" items={elementsOf(data, "MECHANIC")} value={form.relatedMechanicIds} onChange={(value) => setForm({ ...form, relatedMechanicIds: value })} />
          <RelationPicker label="Personagens" items={elementsOf(data, "CHARACTER")} value={form.relatedCharacterIds} onChange={(value) => setForm({ ...form, relatedCharacterIds: value })} />
          <RelationPicker label="Itens" items={elementsOf(data, "ITEM")} value={form.relatedItemIds} onChange={(value) => setForm({ ...form, relatedItemIds: value })} />
          <RelationPicker label="Diálogos" items={elementsOf(data, "DIALOGUE")} value={form.relatedDialogueIds} onChange={(value) => setForm({ ...form, relatedDialogueIds: value })} />
          <RelationPicker label="Missões" items={elementsOf(data, "QUEST")} value={form.relatedQuestIds} onChange={(value) => setForm({ ...form, relatedQuestIds: value })} />
          <Button
            onClick={() => {
              mutate({ path: `/api/projects/${projectId}/demo-manager/playable-steps`, method: "POST", body: { ...form, relatedLocationId: form.relatedLocationId || null } });
              setForm({ title: "", description: "", playerAction: "", playerObjective: "", expectedResult: "", relatedLocationId: "", relatedCharacterIds: [], relatedItemIds: [], relatedMechanicIds: [], relatedQuestIds: [], relatedDialogueIds: [], status: "IDEA", priority: "ESSENTIAL", notes: "" });
            }}
            disabled={!form.title.trim()}
          >
            Criar passo
          </Button>
        </div>
        {data.diagnostic.weakDependencyAlerts > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
            Existem passos essenciais dependendo de itens ainda em ideia, planejados, cortados ou adiados.
          </div>
        )}
        <div className="grid gap-3">
          {data.playableSteps.map((step, index) => (
            <ItemCard
              key={step.id}
              title={`${index + 1}. ${step.title}`}
              subtitle={`${statusLabels[step.status]} · ${priorityLabels[step.priority]}${blockedIds.has(step.id) ? " · Bloqueado" : ""}`}
              details={step.description}
              onEdit={() => {
                const title = window.prompt("Título", step.title);
                if (!title) {
                  return;
                }
                mutate({ path: `/api/projects/${projectId}/demo-manager/playable-steps/${step.id}`, method: "PATCH", body: { title } });
              }}
              onDelete={() => mutate({ path: `/api/projects/${projectId}/demo-manager/playable-steps/${step.id}`, method: "DELETE" })}
            >
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={index === 0} onClick={() => reorder(data.playableSteps, index, index - 1, projectId, mutate, "playable-steps/reorder")}>
                  <ArrowUp className="h-3.5 w-3.5" /> Subir
                </Button>
                <Button variant="outline" size="sm" disabled={index === data.playableSteps.length - 1} onClick={() => reorder(data.playableSteps, index, index + 1, projectId, mutate, "playable-steps/reorder")}>
                  <ArrowDown className="h-3.5 w-3.5" /> Descer
                </Button>
                <SelectEnum value={step.status} options={statusLabels} onChange={(value) => mutate({ path: `/api/projects/${projectId}/demo-manager/playable-steps/${step.id}`, method: "PATCH", body: { status: value } })} compact />
                <SelectEnum value={step.priority} options={priorityLabels} onChange={(value) => mutate({ path: `/api/projects/${projectId}/demo-manager/playable-steps/${step.id}`, method: "PATCH", body: { priority: value } })} compact />
              </div>
            </ItemCard>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmotionalLine({ data, mutate, projectId }: { data: DemoManagerData; mutate: MutationFn; projectId: string }) {
  const [form, setForm] = useState({ momentName: "", desiredEmotion: "Curiosidade", intensity: "50", playableStepId: "", triggerElements: "", notes: "" });

  return (
    <Card>
      <CardHeader><CardTitle>Linha Emocional</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 rounded-2xl border border-border p-3">
          <Input placeholder="Nome do momento" value={form.momentName} onChange={(event) => setForm({ ...form, momentName: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.desiredEmotion} onChange={(event) => setForm({ ...form, desiredEmotion: event.target.value })}>
              {emotionOptions.map((emotion) => <option key={emotion} value={emotion}>{emotion}</option>)}
            </select>
            <Input type="number" min={0} max={100} value={form.intensity} onChange={(event) => setForm({ ...form, intensity: event.target.value })} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.playableStepId} onChange={(event) => setForm({ ...form, playableStepId: event.target.value })}>
              <option value="">Passo da linha jogável</option>
              {data.playableSteps.map((step) => <option key={step.id} value={step.id}>{step.title}</option>)}
            </select>
          </div>
          <Input placeholder="Elementos de gatilho separados por vírgula" value={form.triggerElements} onChange={(event) => setForm({ ...form, triggerElements: event.target.value })} />
          <Textarea placeholder="Notas" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <Button
            disabled={!form.momentName.trim()}
            onClick={() => {
              mutate({ path: `/api/projects/${projectId}/demo-manager/emotional-beats`, method: "POST", body: { ...form, playableStepId: form.playableStepId || null, intensity: Number(form.intensity), triggerElements: toTags(form.triggerElements) } });
              setForm({ momentName: "", desiredEmotion: "Curiosidade", intensity: "50", playableStepId: "", triggerElements: "", notes: "" });
            }}
          >
            Criar ponto emocional
          </Button>
        </div>
        {data.emotionalBeats.map((beat, index) => (
          <ItemCard
            key={beat.id}
            title={`${index + 1}. ${beat.momentName}`}
            subtitle={`${beat.desiredEmotion} · intensidade ${beat.intensity}`}
            details={beat.notes}
            onEdit={() => {
              const momentName = window.prompt("Momento", beat.momentName);
              if (momentName) {
                mutate({ path: `/api/projects/${projectId}/demo-manager/emotional-beats/${beat.id}`, method: "PATCH", body: { momentName } });
              }
            }}
            onDelete={() => mutate({ path: `/api/projects/${projectId}/demo-manager/emotional-beats/${beat.id}`, method: "DELETE" })}
          >
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={index === 0} onClick={() => reorder(data.emotionalBeats, index, index - 1, projectId, mutate, "emotional-beats/reorder")}>Subir</Button>
              <Button variant="outline" size="sm" disabled={index === data.emotionalBeats.length - 1} onClick={() => reorder(data.emotionalBeats, index, index + 1, projectId, mutate, "emotional-beats/reorder")}>Descer</Button>
            </div>
          </ItemCard>
        ))}
      </CardContent>
    </Card>
  );
}

function Priorities({ data }: { data: DemoManagerData }) {
  const items = [
    ...data.elements.map((item) => ({ id: item.id, title: item.name, priority: item.priority, status: item.status, type: kindLabels[item.kind] })),
    ...data.playableSteps.map((step) => ({ id: step.id, title: step.title, priority: step.priority, status: step.status, type: "Linha Jogável" }))
  ];

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader><CardTitle>MVP da Demo</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {items.filter((item) => item.priority === "ESSENTIAL").map((item) => <CompactRow key={item.id} title={item.title} subtitle={`${item.type} · ${statusLabels[item.status]}`} />)}
          {!items.some((item) => item.priority === "ESSENTIAL") && <p className="text-sm text-muted-foreground">Marque itens como essenciais para formar o MVP da demo.</p>}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(priorityLabels) as DemoPriority[]).map((priority) => (
          <Card key={priority}>
            <CardHeader><CardTitle>{priorityLabels[priority]}</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              {items.filter((item) => item.priority === priority).map((item) => <CompactRow key={item.id} title={item.title} subtitle={`${item.type} · ${statusLabels[item.status]}`} />)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Dependencies({ data, mutate, projectId }: { data: DemoManagerData; mutate: MutationFn; projectId: string }) {
  const [form, setForm] = useState({ sourceType: "PLAYABLE_STEP" as DemoDependencyEntityType, sourceId: "", targetType: "ITEM" as DemoDependencyEntityType, targetId: "", dependencyType: "Requer", description: "", isCritical: true });
  const options = entityOptions(data);

  return (
    <Card>
      <CardHeader><CardTitle>Dependências</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 rounded-2xl border border-border p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <EntitySelector label="Origem" type={form.sourceType} id={form.sourceId} options={options} onType={(value) => setForm({ ...form, sourceType: value, sourceId: "" })} onId={(value) => setForm({ ...form, sourceId: value })} />
            <EntitySelector label="Depende de" type={form.targetType} id={form.targetId} options={options} onType={(value) => setForm({ ...form, targetType: value, targetId: "" })} onId={(value) => setForm({ ...form, targetId: value })} />
          </div>
          <Input placeholder="Tipo de dependência" value={form.dependencyType} onChange={(event) => setForm({ ...form, dependencyType: event.target.value })} />
          <Textarea placeholder="Descrição" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isCritical} onChange={(event) => setForm({ ...form, isCritical: event.target.checked })} /> Dependência crítica</label>
          <Button disabled={!form.sourceId || !form.targetId} onClick={() => mutate({ path: `/api/projects/${projectId}/demo-manager/dependencies`, method: "POST", body: form })}>Criar dependência</Button>
        </div>
        {data.diagnostic.weakDependencyAlerts > 0 && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Há dependências críticas de itens essenciais apontando para algo ainda fraco no status.</div>}
        {data.dependencies.map((dependency) => (
          <ItemCard key={dependency.id} title={`${dependency.dependencyType}: ${nameOf(options, dependency.sourceId)} -> ${nameOf(options, dependency.targetId)}`} subtitle={dependency.isCritical ? "Crítica" : "Normal"} details={dependency.description} onDelete={() => mutate({ path: `/api/projects/${projectId}/demo-manager/dependencies/${dependency.id}`, method: "DELETE" })} />
        ))}
      </CardContent>
    </Card>
  );
}

function BugsAndBlockers({ data, mutate, projectId }: { data: DemoManagerData; mutate: MutationFn; projectId: string }) {
  const [bug, setBug] = useState({ title: "", description: "", severity: "MEDIUM" as DemoBugSeverity, status: "OPEN" as DemoBugStatus, affectedPlayableStepId: "" });
  const [blocker, setBlocker] = useState({ title: "", description: "", status: "OPEN" as DemoBugStatus, priority: "IMPORTANT" as DemoPriority, blockedEntityType: "PLAYABLE_STEP" as DemoDependencyEntityType, blockedEntityId: "", cause: "", possibleSolution: "" });
  const options = entityOptions(data);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Bugs</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <Input placeholder="Título do bug" value={bug.title} onChange={(event) => setBug({ ...bug, title: event.target.value })} />
          <Textarea placeholder="Descrição" value={bug.description} onChange={(event) => setBug({ ...bug, description: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectEnum value={bug.severity} options={bugSeverityLabels} onChange={(value) => setBug({ ...bug, severity: value as DemoBugSeverity })} />
            <SelectEnum value={bug.status} options={bugStatusLabels} onChange={(value) => setBug({ ...bug, status: value as DemoBugStatus })} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={bug.affectedPlayableStepId} onChange={(event) => setBug({ ...bug, affectedPlayableStepId: event.target.value })}>
              <option value="">Passo afetado</option>
              {data.playableSteps.map((step) => <option key={step.id} value={step.id}>{step.title}</option>)}
            </select>
          </div>
          <Button disabled={!bug.title.trim()} onClick={() => mutate({ path: `/api/projects/${projectId}/demo-manager/bugs`, method: "POST", body: { ...bug, affectedPlayableStepId: bug.affectedPlayableStepId || null } })}>Criar bug</Button>
          {data.bugs.map((item) => <ItemCard key={item.id} title={item.title} subtitle={`${bugSeverityLabels[item.severity]} · ${bugStatusLabels[item.status]}`} details={item.description} onDelete={() => mutate({ path: `/api/projects/${projectId}/demo-manager/bugs/${item.id}`, method: "DELETE" })} />)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bloqueios</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <Input placeholder="Título do bloqueio" value={blocker.title} onChange={(event) => setBlocker({ ...blocker, title: event.target.value })} />
          <Textarea placeholder="Descrição" value={blocker.description} onChange={(event) => setBlocker({ ...blocker, description: event.target.value })} />
          <EntitySelector label="Item bloqueado" type={blocker.blockedEntityType} id={blocker.blockedEntityId} options={options} onType={(value) => setBlocker({ ...blocker, blockedEntityType: value, blockedEntityId: "" })} onId={(value) => setBlocker({ ...blocker, blockedEntityId: value })} />
          <Input placeholder="Causa" value={blocker.cause} onChange={(event) => setBlocker({ ...blocker, cause: event.target.value })} />
          <Input placeholder="Possível solução" value={blocker.possibleSolution} onChange={(event) => setBlocker({ ...blocker, possibleSolution: event.target.value })} />
          <Button disabled={!blocker.title.trim()} onClick={() => mutate({ path: `/api/projects/${projectId}/demo-manager/blockers`, method: "POST", body: { ...blocker, blockedEntityId: blocker.blockedEntityId || null } })}>Criar bloqueio</Button>
          {data.blockers.map((item) => <ItemCard key={item.id} title={item.title} subtitle={`${bugStatusLabels[item.status]} · ${priorityLabels[item.priority]}`} details={item.description} onDelete={() => mutate({ path: `/api/projects/${projectId}/demo-manager/blockers/${item.id}`, method: "DELETE" })} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function CurrentStage({ data, mutate, projectId }: { data: DemoManagerData; mutate: MutationFn; projectId: string }) {
  const [form, setForm] = useState({ currentStage: data.plan.currentStage, progressEstimate: String(data.plan.progressEstimate), stageExitCriteria: data.plan.stageExitCriteria ?? "", activeProblems: data.plan.activeProblems ?? "", notes: data.plan.notes ?? "" });

  return (
    <Card>
      <CardHeader><CardTitle>Etapa Atual</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <SelectEnum value={form.currentStage} options={stageLabels} onChange={(value) => setForm({ ...form, currentStage: value as DemoStage })} />
        <Input type="number" min={0} max={100} value={form.progressEstimate} onChange={(event) => setForm({ ...form, progressEstimate: event.target.value })} />
        <Textarea placeholder="Critérios para avançar" value={form.stageExitCriteria} onChange={(event) => setForm({ ...form, stageExitCriteria: event.target.value })} />
        <Textarea placeholder="Problemas ativos" value={form.activeProblems} onChange={(event) => setForm({ ...form, activeProblems: event.target.value })} />
        <Textarea placeholder="Notas da etapa" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        <Button onClick={() => mutate({ path: `/api/projects/${projectId}/demo-manager`, method: "PATCH", body: { ...form, progressEstimate: Number(form.progressEstimate) } })}>Salvar etapa</Button>
      </CardContent>
    </Card>
  );
}

function ExportImport({ data, projectId, mutate }: { data: DemoManagerData; projectId: string; mutate: MutationFn }) {
  const [json, setJson] = useState("");

  return (
    <Card>
      <CardHeader><CardTitle>Exportar / Importar</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Exporta o plano, entidades, linha jogável, linha emocional, dependências, bugs e bloqueios.</p>
          <Button className="mt-3" asChild>
            <a href={`/api/projects/${projectId}/demo-manager/export`} download>
              <Download className="h-4 w-4" /> Baixar JSON
            </a>
          </Button>
        </div>
        <Textarea className="min-h-56 font-mono text-xs" placeholder="Cole aqui o JSON do Demo Manager" value={json} onChange={(event) => setJson(event.target.value)} />
        <Button
          variant="outline"
          onClick={() => {
            const payload = JSON.parse(json);
            mutate({ path: `/api/projects/${projectId}/demo-manager/import`, method: "POST", body: payload });
            setJson("");
          }}
          disabled={!json.trim()}
        >
          <Upload className="h-4 w-4" /> Importar JSON
        </Button>
        <p className="text-xs text-muted-foreground">Estado atual: {data.diagnostic.playable ? "jogável" : "não jogável"}.</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ItemCard({ title, subtitle, details, onEdit, onDelete, children }: { title: string; subtitle?: string; details?: string | null; onEdit?: () => void; onDelete?: () => void; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          {details && <p className="mt-2 text-sm text-muted-foreground">{details}</p>}
        </div>
        <div className="flex gap-2">
          {onEdit && <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>}
          {onDelete && <Button variant="destructive" size="sm" onClick={onDelete}>Excluir</Button>}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CompactRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function SelectEnum({ value, options, onChange, compact = false }: { value: string; options: Record<string, string>; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <select className={cn("rounded-md border border-input bg-background px-3 text-sm", compact ? "h-8" : "h-10 w-full")} value={value} onChange={(event) => onChange(event.target.value)}>
      {Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
  );
}

function RelationPicker({ label, items, value, onChange }: { label: string; items: DemoElement[]; value: string[]; onChange: (value: string[]) => void }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
            <input
              type="checkbox"
              checked={value.includes(item.id)}
              onChange={(event) => onChange(event.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id))}
            />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function EntitySelector({ label, type, id, options, onType, onId }: { label: string; type: DemoDependencyEntityType; id: string; options: Record<DemoDependencyEntityType, Array<{ id: string; name: string }>>; onType: (value: DemoDependencyEntityType) => void; onId: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(event) => onType(event.target.value as DemoDependencyEntityType)}>
        {Object.keys(options).map((key) => <option key={key} value={key}>{entityTypeLabel(key as DemoDependencyEntityType)}</option>)}
      </select>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={id} onChange={(event) => onId(event.target.value)}>
        <option value="">Selecione</option>
        {options[type].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </div>
  );
}

function elementsOf(data: DemoManagerData, kind: DemoElementKind) {
  return data.elements.filter((element) => element.kind === kind);
}

function entityOptions(data: DemoManagerData) {
  return {
    MECHANIC: elementsOf(data, "MECHANIC").map((item) => ({ id: item.id, name: item.name })),
    CHARACTER: elementsOf(data, "CHARACTER").map((item) => ({ id: item.id, name: item.name })),
    ITEM: elementsOf(data, "ITEM").map((item) => ({ id: item.id, name: item.name })),
    LOCATION: elementsOf(data, "LOCATION").map((item) => ({ id: item.id, name: item.name })),
    DIALOGUE: elementsOf(data, "DIALOGUE").map((item) => ({ id: item.id, name: item.name })),
    QUEST: elementsOf(data, "QUEST").map((item) => ({ id: item.id, name: item.name })),
    PLAYABLE_STEP: data.playableSteps.map((item) => ({ id: item.id, name: item.title })),
    EMOTIONAL_BEAT: data.emotionalBeats.map((item) => ({ id: item.id, name: item.momentName })),
    BUG: data.bugs.map((item) => ({ id: item.id, name: item.title })),
    BLOCKER: data.blockers.map((item) => ({ id: item.id, name: item.title }))
  };
}

function entityTypeLabel(type: DemoDependencyEntityType) {
  if (isElementKind(type)) {
    return kindLabels[type as DemoElementKind];
  }

  return {
    PLAYABLE_STEP: "Linha Jogável",
    EMOTIONAL_BEAT: "Linha Emocional",
    BUG: "Bug",
    BLOCKER: "Bloqueio"
  }[type];
}

function isElementKind(type: DemoDependencyEntityType): type is DemoElementKind {
  return type === "MECHANIC" || type === "CHARACTER" || type === "ITEM" || type === "LOCATION" || type === "DIALOGUE" || type === "QUEST";
}

function nameOf(options: Record<DemoDependencyEntityType, Array<{ id: string; name: string }>>, id: string) {
  for (const items of Object.values(options)) {
    const found = items.find((item) => item.id === id);
    if (found) {
      return found.name;
    }
  }

  return "Item removido";
}

function reorder(items: Array<{ id: string }>, from: number, to: number, projectId: string, mutate: MutationFn, route: string) {
  const ordered = [...items];
  const [item] = ordered.splice(from, 1);
  ordered.splice(to, 0, item);
  mutate({ path: `/api/projects/${projectId}/demo-manager/${route}`, method: "PATCH", body: { orderedIds: ordered.map((entry) => entry.id) } });
}

function toTags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

type MutationFn = (variables: { path: string; method: string; body?: unknown }) => void;
