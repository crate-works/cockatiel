import { AlertCircleIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { completeSignIn, HOME_PATH, useAuthStore } from '@/lib/auth';

interface AuthCallbackProps {
  onDone: () => void;
}

export const AuthCallback = ({ onDone }: AuthCallbackProps) => {
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: onDone is a callback that may identity-change between renders; we only want this effect to fire once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const callbackUrl = new URL(window.location.href);
        const { providerId, tokens, user } = await completeSignIn(callbackUrl);
        if (cancelled) {
          return;
        }
        setSession(providerId, tokens, user);
        // Strip the ?code= and ?state= from the address bar before handing back
        // to the app — leaving them in is ugly and the browser would re-trigger
        // the callback on a refresh.
        window.history.replaceState({}, '', HOME_PATH);
        onDone();
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
        <AlertCircleIcon className="h-6 w-6 text-destructive" />
        <p className="font-medium text-sm">Sign-in failed</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.history.replaceState({}, '', HOME_PATH);
            onDone();
          }}
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
      <Loader2Icon className="h-4 w-4 animate-spin" />
      Completing sign-in…
    </div>
  );
};
