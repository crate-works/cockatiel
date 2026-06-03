import { z } from 'zod';
import type { Provider } from './types';

const oidcConfigSchema = z.object({
  issuer: z.string(),
  clientId: z.string(),
  scopes: z.string(),
});

const providerSchema = z.object({
  id: z.string(),
  label: z.string(),
  baseUrl: z.string(),
  itemUrlTemplate: z.string(),
  oidc: oidcConfigSchema.optional(),
});

const providersConfigSchema = z.array(providerSchema);

// Providers are a deployment concern, not hardcoded source: the official build
// ships config.json (PARADISEC + LDaCA), self-host docker images mount their own.
// `ProviderId` is therefore a plain string, validated at runtime against the
// loaded list rather than a compile-time literal union.
export type ProviderId = string;

// Module singleton populated by loadProviders() during bootstrap (src/main.tsx),
// before any store or component reads it. Stays empty when no/invalid config is
// present — the app still works for local files; only the catalog UI is gated off.
let providers: readonly Provider[] = [];

export const listProviders = (): readonly Provider[] => providers;

export const getProvider = (id: string): Provider | undefined => providers.find((p) => p.id === id);

export const isProviderId = (id: string): boolean => providers.some((p) => p.id === id);

export const defaultProviderId = (): ProviderId | undefined => providers[0]?.id;

export const itemCatalogUrl = (provider: Provider, itemEntityId: string): string =>
  provider.itemUrlTemplate.replace('{itemId}', encodeURIComponent(itemEntityId));

// Fetch + validate the runtime provider config. Called once before the app
// renders. A missing/unparseable config leaves the list empty rather than
// throwing — note GitHub Pages serves the 404.html body for a missing file, so
// we reject non-OK and non-JSON responses instead of trying to parse them.
export const loadProviders = async (): Promise<void> => {
  const url = `${import.meta.env.BASE_URL}config.json`;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      console.warn(`No catalog config at ${url} (HTTP ${response.status}); catalog disabled.`);
      return;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      console.warn(`Catalog config at ${url} is not JSON (got "${contentType || 'no content-type'}"); catalog disabled.`);
      return;
    }
    providers = providersConfigSchema.parse(await response.json());
  } catch (error) {
    console.warn('Failed to load catalog config; catalog disabled.', error);
    providers = [];
  }
};
