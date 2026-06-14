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

    let resolvedValue1: any;
  if (hasLegacyAssignee) {
    resolvedValue1 = (
          <SelectItem value={value}>
            {value} (legado)
          </SelectItem>
        );
  } else {
    resolvedValue1 = null;
  }
return (
    <Select value={selectedValue} onValueChange={(nextValue) => {
      let resolvedValue0: any;
      if (nextValue === "none") {
        resolvedValue0 = "";
      } else {
        resolvedValue0 = nextValue;
      }
      return onChange(resolvedValue0);
    }}>
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
        {resolvedValue1}
      </SelectContent>
    </Select>
  );
}
