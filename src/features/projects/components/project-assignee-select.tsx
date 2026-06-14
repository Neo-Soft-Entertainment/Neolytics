"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectAssigneeOption } from "@/features/projects/types";

export function ProjectAssigneeSelect({
  value,
  onChange,
  assigneeOptions,
  placeholder = "Responsável"
}: {
  value: string;
  onChange: (value: string) => void;
  assigneeOptions: ProjectAssigneeOption[];
  placeholder?: string;
}) {
  const selectedValue = value || "none";
  const hasLegacyAssignee = value && assigneeOptions.every((option) => option.label !== value);

  return (
    <Select value={selectedValue} onValueChange={(nextValue) => onChange(nextValue === "none" ? "" : nextValue)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem responsável</SelectItem>
        {assigneeOptions.map((option) => (
          <SelectItem key={option.id} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
        {hasLegacyAssignee ? (
          <SelectItem value={value}>
            {value} (legado)
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}
