import { ChevronDownIcon, LogInIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { listProviders } from '@/lib/arocapi';
import { beginSignIn, useAuthStore } from '@/lib/auth';

// Header-level "Accounts" affordance — secondary entry point for managing all
// providers at once. The provider dropdown on the search page is the primary
// per-provider sign-in surface.
export const SignInMenu = () => {
  const sessions = useAuthStore((s) => s.sessions);
  const signOut = useAuthStore((s) => s.signOut);
  const [busyProviderId, setBusyProviderId] = useState<string | null>(null);

  const providers = listProviders().filter((p) => p.oidc !== undefined);
  if (providers.length === 0) {
    return null;
  }

  const handleSignIn = async (providerId: string) => {
    setBusyProviderId(providerId);
    try {
      await beginSignIn(providerId);
      // beginSignIn calls window.location.assign — control transfers to the IdP.
    } catch (err) {
      setBusyProviderId(null);
      toast.error(`Sign-in failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const activeSessions = providers
    .map((p) => ({ provider: p, session: sessions[p.id] ?? null }))
    .filter((entry): entry is { provider: (typeof providers)[number]; session: NonNullable<(typeof sessions)[string]> } => entry.session !== null);

  // Compact unauthenticated state: a single button when only one provider needs
  // login, a dropdown when there are multiple.
  if (activeSessions.length === 0 && providers.length === 1) {
    const only = providers[0];
    return (
      <Button variant="ghost" size="sm" onClick={() => handleSignIn(only.id)} disabled={busyProviderId !== null} className="h-7 px-2 text-xs">
        <LogInIcon className="mr-1 h-3.5 w-3.5" />
        {busyProviderId === only.id ? 'Signing in…' : `Sign in to ${only.label}`}
      </Button>
    );
  }

  const triggerLabel = (() => {
    if (activeSessions.length === 0) {
      return 'Sign in';
    }
    if (activeSessions.length === 1) {
      const u = activeSessions[0].session.user;
      return u?.name ?? u?.email ?? activeSessions[0].provider.label;
    }
    return `${activeSessions.length} accounts`;
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground text-xs outline-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted"
        aria-label="Accounts"
      >
        {activeSessions.length > 0 ? <UserIcon className="h-3.5 w-3.5" /> : <LogInIcon className="h-3.5 w-3.5" />}
        <span className="max-w-[160px] truncate">{triggerLabel}</span>
        <ChevronDownIcon className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {providers.map((provider) => {
          const session = sessions[provider.id] ?? null;
          if (session) {
            const label = session.user?.email ?? session.user?.name ?? session.user?.sub ?? 'Signed in';
            return (
              <DropdownMenuItem key={provider.id} onClick={() => signOut(provider.id)}>
                <LogOutIcon className="h-4 w-4" />
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium text-xs">{provider.label}</span>
                  <span className="truncate text-muted-foreground text-xs">{label}</span>
                </div>
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuItem key={provider.id} onClick={() => handleSignIn(provider.id)} disabled={busyProviderId === provider.id}>
              <LogInIcon className="h-4 w-4" />
              <span className="text-xs">{busyProviderId === provider.id ? `Signing in to ${provider.label}…` : `Sign in to ${provider.label}`}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
