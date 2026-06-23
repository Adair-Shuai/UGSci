import type {
  LoadI18nNamespaceModuleParams,
  LoadI18nNamespaceModuleWithFallbackParams,
} from './loadI18nNamespaceModule';

// Use import.meta.glob so Vite can statically analyze and avoid CJS/dynamic import issues
const defaultLoaders = import.meta.glob<{ default: Record<string, unknown> }>(
  '/packages/locales/src/default/*.ts',
);
const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>('/locales/*/*.json');

const getDefaultKey = (ns: string) => `/packages/locales/src/default/${ns}.ts`;
const getLocaleKey = (lng: string, ns: string) => `/locales/${lng}/${ns}.json`;

export const loadI18nNamespaceModule = async (
  params: LoadI18nNamespaceModuleParams,
): Promise<{ default: Record<string, unknown> }> => {
  const { defaultLang, normalizeLocale, lng, ns } = params;

  // Always try JSON locale files first, even for the default language.
  // When DEFAULT_LANG matches the detected language, the synced bundled
  // resources may be in a different language (e.g. English defaults under
  // zh-CN key). Loading from JSON ensures the correct translated resources
  // are fetched regardless.
  const normalizedLng = normalizeLocale(lng);
  const localeKey = getLocaleKey(normalizedLng, ns);
  const loadLocale = localeLoaders[localeKey];
  if (loadLocale) {
    return loadLocale() as Promise<{ default: Record<string, unknown> }>;
  }

  // Fallback to default TS files when no JSON locale exists for this language
  const loadDefault = defaultLoaders[getDefaultKey(ns)];
  if (!loadDefault) throw new Error(`Missing default namespace: ${ns}`);
  return loadDefault() as Promise<{ default: Record<string, unknown> }>;
};

export type {
  LoadI18nNamespaceModuleParams,
  LoadI18nNamespaceModuleWithFallbackParams,
} from './loadI18nNamespaceModule';

export const loadI18nNamespaceModuleWithFallback = async (
  params: LoadI18nNamespaceModuleWithFallbackParams,
): Promise<{ default: Record<string, unknown> }> => {
  const { onFallback, ...rest } = params;
  try {
    return await loadI18nNamespaceModule(rest);
  } catch (error) {
    onFallback?.({ error, lng: rest.lng, ns: rest.ns });
    const loadDefault = defaultLoaders[getDefaultKey(rest.ns)];
    if (!loadDefault) throw error;
    return loadDefault() as Promise<{ default: Record<string, unknown> }>;
  }
};
