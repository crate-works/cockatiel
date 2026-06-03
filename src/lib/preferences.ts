import { defaultProviderId, isProviderId, type ProviderId } from './arocapi';

const STORAGE_KEY = 'cockatiel:skipDownloadConfirm';
const PROVIDER_KEY = 'cockatiel:lastProviderId';

const safeStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const getSkipDownloadConfirm = (): boolean => {
  const storage = safeStorage();
  return storage?.getItem(STORAGE_KEY) === '1';
};

export const setSkipDownloadConfirm = (value: boolean): void => {
  const storage = safeStorage();
  if (!storage) {
    return;
  }
  if (value) {
    storage.setItem(STORAGE_KEY, '1');
  } else {
    storage.removeItem(STORAGE_KEY);
  }
};

// Returns the remembered provider if it's still a known one, else the first
// configured provider, else undefined when no catalog is configured.
export const getLastProviderId = (): ProviderId | undefined => {
  const storage = safeStorage();
  const raw = storage?.getItem(PROVIDER_KEY);
  return raw && isProviderId(raw) ? raw : defaultProviderId();
};

export const setLastProviderId = (id: ProviderId): void => {
  const storage = safeStorage();
  storage?.setItem(PROVIDER_KEY, id);
};
