import type { Provider } from './types';

const providers = [
  {
    id: 'paradisec',
    label: 'PARADISEC',
    baseUrl: 'https://admin-catalog.paradisec.org.au/api/v1/oni',
    itemUrlTemplate: 'https://catalog.paradisec.org.au/items/{itemId}',
    oidc: {
      issuer: 'https://admin-catalog.paradisec.org.au',
      clientId: '9cYKX8nNk4bO_hyp2aanNYO-b5mC1pm2yVltT1zfdDc',
      // `public` is required by PARADISEC's Doorkeeper API for read access; rest
      // are standard OIDC claims for the user chip.
      scopes: 'openid profile email public',
    },
  },
  {
    id: 'ldaca',
    label: 'LDaCA',
    baseUrl: 'https://dev.ldaca.edu.au/api',
    itemUrlTemplate: 'https://dev.ldaca.edu.au/items/{itemId}',
    // LDaCA is currently public; when it gains auth, populate `oidc` here.
  },
] as const satisfies readonly Provider[];

export type ProviderId = (typeof providers)[number]['id'];

export const DEFAULT_PROVIDER_ID: ProviderId = 'paradisec';

export const listProviders = (): readonly Provider[] => providers;

export const getProvider = (id: string): Provider | undefined => providers.find((p) => p.id === id);

export const isProviderId = (id: string): id is ProviderId => providers.some((p) => p.id === id);

export const itemCatalogUrl = (provider: Provider, itemEntityId: string): string =>
  provider.itemUrlTemplate.replace('{itemId}', encodeURIComponent(itemEntityId));
