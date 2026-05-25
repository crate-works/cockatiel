import type { Provider } from './types';

const providers = [
  {
    id: 'paradisec',
    label: 'PARADISEC',
    baseUrl: 'https://admin-catalog.paradisec.org.au/api/v1/oni',
    itemUrlTemplate: 'https://catalog.paradisec.org.au/items/{itemId}',
  },
  {
    id: 'ldaca',
    label: 'LDaCA',
    baseUrl: 'https://dev.ldaca.edu.au/api',
    itemUrlTemplate: 'https://dev.ldaca.edu.au/items/{itemId}',
  },
] as const satisfies readonly Provider[];

export type ProviderId = (typeof providers)[number]['id'];

export const DEFAULT_PROVIDER_ID: ProviderId = 'paradisec';

export const listProviders = (): readonly Provider[] => providers;

export const getProvider = (id: string): Provider | undefined => providers.find((p) => p.id === id);

export const isProviderId = (id: string): id is ProviderId => providers.some((p) => p.id === id);

export const itemCatalogUrl = (provider: Provider, itemEntityId: string): string =>
  provider.itemUrlTemplate.replace('{itemId}', encodeURIComponent(itemEntityId));
