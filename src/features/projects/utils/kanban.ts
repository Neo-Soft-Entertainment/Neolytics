export function getKanbanCardLabels(labels: unknown) {
  if (!Array.isArray(labels)) {
    return [];
  }

  return labels.filter((label): label is string => typeof label === "string" && Boolean(label.trim()));
}
