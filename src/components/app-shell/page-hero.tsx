import type { ReactNode } from "react";

export function PageHero({
  title
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
  );
}
