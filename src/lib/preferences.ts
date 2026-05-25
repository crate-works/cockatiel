import { DEFAULT_PROVIDER_ID, isProviderId, type ProviderId } from './arocapi';

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

export const getLastProviderId = (): ProviderId => {
  const storage = safeStorage();
  const raw = storage?.getItem(PROVIDER_KEY);
  return raw && isProviderId(raw) ? raw : DEFAULT_PROVIDER_ID;
};

export const setLastProviderId = (id: ProviderId): void => {
  const storage = safeStorage();
  storage?.setItem(PROVIDER_KEY, id);
};
