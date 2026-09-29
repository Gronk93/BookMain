import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonEs from "./locales/es-MX/common.json";
import authEs from "./locales/es-MX/auth.json";
import libraryEs from "./locales/es-MX/library.json";
import readerEs from "./locales/es-MX/reader.json";
import notesEs from "./locales/es-MX/notes.json";
import studyEs from "./locales/es-MX/study.json";
import settingsEs from "./locales/es-MX/settings.json";
import errorsEs from "./locales/es-MX/errors.json";

import commonEn from "./locales/en-US/common.json";
import authEn from "./locales/en-US/auth.json";
import libraryEn from "./locales/en-US/library.json";
import readerEn from "./locales/en-US/reader.json";
import notesEn from "./locales/en-US/notes.json";
import studyEn from "./locales/en-US/study.json";
import settingsEn from "./locales/en-US/settings.json";
import errorsEn from "./locales/en-US/errors.json";

export const defaultNS = "common";
export const resources = {
  "es-MX": {
    common: commonEs,
    auth: authEs,
    library: libraryEs,
    reader: readerEs,
    notes: notesEs,
    study: studyEs,
    settings: settingsEs,
    errors: errorsEs,
  },
  "en-US": {
    common: commonEn,
    auth: authEn,
    library: libraryEn,
    reader: readerEn,
    notes: notesEn,
    study: studyEn,
    settings: settingsEn,
    errors: errorsEn,
  },
} as const;

export type SupportedLanguage = "es-MX" | "en-US";

function getInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem("bookmind-language");
    if (saved === "es-MX" || saved === "en-US") {
      return saved;
    }
  } catch {
    // ignore
  }
  return "es-MX";
}

const initialLang = getInitialLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: "es-MX",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

// Sync html lang tag and persist
if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
}

i18n.on("languageChanged", (lng: string) => {
  try {
    localStorage.setItem("bookmind-language", lng);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lng;
    }
  } catch {
    // ignore
  }
});

export default i18n;
