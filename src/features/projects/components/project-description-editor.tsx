"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ProjectDescriptionEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 560)}px`;
  }, [value]);

  function insertText(before: string, after = "", fallback = "") {
    const textarea = textareaRef.current;

    if (!textarea) {
      onChange(`${value}${before}${fallback}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    const cursor = start + before.length + selected.length + after.length;

    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <Button type="button" size="sm" variant="outline" onClick={() => insertText("# ", "", "Título")}>
          Título
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => insertText("**", "**", "texto em negrito")}>
          Negrito
        </Button>
      </div>
      <Textarea
        ref={textareaRef}
        className="min-h-[560px] resize-none rounded-none border-0 bg-transparent px-5 py-5 text-base leading-7 shadow-none focus-visible:ring-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"# Visão do negócio\n\nEscreva livremente. Use **negrito** para decisões importantes, riscos e critérios."}
      />
    </div>
  );
}
