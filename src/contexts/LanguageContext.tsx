"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Language } from "@/lib/i18n";

const LANG_STORAGE_KEY = "lang";

const LanguageContext = createContext<{
  lang: Language;
  setLang: (l: Language) => void;
}>({ lang: "tr", setLang: () => {} });

export function LanguageProvider({
  children,
  initialLang,
}: {
  children: React.ReactNode;
  initialLang: Language;
}) {
  const [lang, setLangState] = useState<Language>(initialLang);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, l);
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LANG_STORAGE_KEY) : null;
    if (stored === "tr" || stored === "az" || stored === "ky") {
      setLangState(stored as Language);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
