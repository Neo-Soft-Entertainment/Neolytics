"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectDescriptionEditor } from "@/features/projects/components/project-description-editor";
import type { ProjectOverviewFormState } from "@/features/projects/types";

const projectStageOptions = [
  "DISCOVERY",
  "PRE_PRODUCTION",
  "PRODUCTION",
  "LIVE",
  "ARCHIVED"
] as const;

export function ProjectOverviewForm({
  form,
  isSaving,
  savingLabel,
  saveLabel,
  onChange,
  onSave
}: {
  form: ProjectOverviewFormState;
  isSaving: boolean;
  savingLabel: string;
  saveLabel: string;
  onChange: (form: ProjectOverviewFormState) => void;
  onSave: () => void;
}) {
  function updateField(field: keyof ProjectOverviewFormState, value: string) {
    onChange({
      ...form,
      [field]: value
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="pointer-events-none h-px w-full shimmer-divider opacity-60" />
      <CardHeader>
        <CardTitle>Definição do projeto</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="detail-name">Nome do projeto</Label>
          <Input id="detail-name" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Estágio</Label>
          <Select value={form.stage} onValueChange={(value) => updateField("stage", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectStageOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-genres">Gêneros</Label>
          <Input id="detail-genres" value={form.genreInput} onChange={(event) => updateField("genreInput", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-tags">Tags</Label>
          <Input id="detail-tags" value={form.tagInput} onChange={(event) => updateField("tagInput", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-monetization">Monetização</Label>
          <Input id="detail-monetization" value={form.monetizationModel} onChange={(event) => updateField("monetizationModel", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-price">Preço alvo (centavos)</Label>
          <Input id="detail-price" value={form.pricePointCents} onChange={(event) => updateField("pricePointCents", event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="detail-pitch">Pitch curto</Label>
          <Textarea id="detail-pitch" className="min-h-24" value={form.elevatorPitch} onChange={(event) => updateField("elevatorPitch", event.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Descrição do negócio</Label>
          <ProjectDescriptionEditor value={form.description} onChange={(description) => updateField("description", description)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-audience">Público-alvo</Label>
          <Textarea id="detail-audience" value={form.targetAudience} onChange={(event) => updateField("targetAudience", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-core-loop">Loop principal</Label>
          <Textarea id="detail-core-loop" value={form.coreLoop} onChange={(event) => updateField("coreLoop", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-differentiator">Diferencial</Label>
          <Textarea id="detail-differentiator" value={form.differentiator} onChange={(event) => updateField("differentiator", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-fantasy">Fantasia do jogador</Label>
          <Textarea id="detail-fantasy" value={form.playerFantasy} onChange={(event) => updateField("playerFantasy", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="detail-art">Direção de arte</Label>
          <Input id="detail-art" value={form.artDirection} onChange={(event) => updateField("artDirection", event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Button disabled={isSaving} onClick={onSave}>
            {isSaving ? savingLabel : saveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
