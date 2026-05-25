import { ExternalLinkIcon } from 'lucide-react';
import { type CatalogSource, getProvider, itemCatalogUrl, useCatalogEntity } from '@/lib/arocapi';

interface SourceBadgeProps {
  source: CatalogSource;
  /**
   * When true, re-fetches the entity from the catalog to surface a friendly
   * title. Use sparingly — only the singleton badge in <Header> should be
   * live. Workbench session rows render many badges, so they pass live=false
   * and display only the stored IDs.
   */
  live?: boolean;
}

export const SourceBadge = ({ source, live = false }: SourceBadgeProps) => {
  const provider = getProvider(source.providerId);
  const entityQuery = useCatalogEntity(live ? source : undefined);

  if (!provider) {
    return null;
  }

  const title = live && entityQuery.data ? entityQuery.data.name : null;
  const href = itemCatalogUrl(provider, source.itemEntityId);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={`${provider.label} · ${source.itemEntityId}`}
      className="inline-flex shrink-0 items-center gap-1 rounded border border-border/60 bg-muted/60 px-1.5 py-0 font-medium text-[10px] text-muted-foreground hover:border-border hover:text-foreground"
    >
      <span>{provider.label}</span>
      <span aria-hidden="true">·</span>
      <span className="max-w-[160px] truncate">{title ?? source.itemEntityId}</span>
      <ExternalLinkIcon className="h-2.5 w-2.5" />
    </a>
  );
};
