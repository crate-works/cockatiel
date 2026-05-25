import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

const DEBOUNCE_MS = 350;

interface SearchInputProps {
  initialValue: string;
  onQueryChange: (value: string) => void;
}

export const SearchInput = ({ initialValue, onQueryChange }: SearchInputProps) => {
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedRef = useRef(initialValue);

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const emitQuery = (next: string) => {
    if (next === lastEmittedRef.current) {
      return;
    }
    lastEmittedRef.current = next;
    onQueryChange(next);
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => emitQuery(next.trim()), DEBOUNCE_MS);
  };

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    emitQuery(value.trim());
  };

  const handleClear = () => {
    setValue('');
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    emitQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search the catalog"
        aria-label="Search catalog"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="pr-9 pl-9"
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="-translate-y-1/2 absolute top-1/2 right-2 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
};
