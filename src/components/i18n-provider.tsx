"use client";

import { createContext, useContext } from "react";

import { resolveUiLanguage, translate, type TranslationKey, type UiLanguage } from "@/lib/i18n";

const I18nContext = createContext<{
  language: UiLanguage;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}>({
  language: "en",
  t: (key) => key
});

export function I18nProvider({
  language,
  children
}: {
  language?: string | null;
  children: React.ReactNode;
}) {
  const resolvedLanguage = resolveUiLanguage(language);

  return (
    <I18nContext.Provider
      value={{
        language: resolvedLanguage,
        t: (key, values) => translate(resolvedLanguage, key, values)
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext).t;
}

export function useUiLanguage() {
  return useContext(I18nContext).language;
}
