import { createFileRoute } from '@tanstack/react-router';
import { CatalogSearchPage } from '@/components/catalog/CatalogSearchPage';
import { validateCatalogSearch } from '@/lib/catalog/search';

export const Route = createFileRoute('/catalog')({
  validateSearch: validateCatalogSearch,
  component: CatalogSearchPage,
});
