import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

type Cell = { kind: 'page'; value: number } | { kind: 'gap'; key: string };

const pageRange = (current: number, totalPages: number): Cell[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => ({ kind: 'page', value: i + 1 }));
  }
  const result: Cell[] = [{ kind: 'page', value: 1 }];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) {
    result.push({ kind: 'gap', key: 'gap-left' });
  }
  for (let p = start; p <= end; p++) {
    result.push({ kind: 'page', value: p });
  }
  if (end < totalPages - 1) {
    result.push({ kind: 'gap', key: 'gap-right' });
  }
  result.push({ kind: 'page', value: totalPages });
  return result;
};

export const Pagination = ({ page, pageSize, total, onPageChange }: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return null;
  }
  const cells = pageRange(page, totalPages);
  return (
    <nav aria-label="Results pagination" className="flex flex-wrap items-center justify-center gap-1">
      <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>
      {cells.map((cell) =>
        cell.kind === 'gap' ? (
          <span key={cell.key} className="px-2 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Button
            key={cell.value}
            size="sm"
            variant={cell.value === page ? 'default' : 'ghost'}
            onClick={() => onPageChange(cell.value)}
            aria-current={cell.value === page ? 'page' : undefined}
            aria-label={`Page ${cell.value}`}
          >
            {cell.value}
          </Button>
        ),
      )}
      <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </nav>
  );
};
