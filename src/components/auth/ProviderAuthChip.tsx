import { LogInIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getProvider } from '@/lib/arocapi';
import { beginSignIn, useAuthStore } from '@/lib/auth';

interface ProviderAuthChipProps {
  providerId: string;
}

// Contextual auth surface for the catalog search page — shows the *current*
// provider's auth status with a primary sign-in action. The Header's
// SignInMenu remains as the global "manage all accounts" affordance.
export const ProviderAuthChip = ({ providerId }: ProviderAuthChipProps) => {
  const provider = getProvider(providerId);
  const session = useAuthStore((s) => s.sessions[providerId] ?? null);
  const signOut = useAuthStore((s) => s.signOut);
  const [signingIn, setSigningIn] = useState(false);

  if (!provider?.oidc) {
    return null;
  }

  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={signingIn}
        onClick={async () => {
          setSigningIn(true);
          try {
            await beginSignIn(providerId);
          } catch (err) {
            setSigningIn(false);
            toast.error(`Sign-in failed: ${err instanceof Error ? err.message : 'unknown error'}`);
          }
        }}
        className="h-8"
      >
        <LogInIcon className="h-3.5 w-3.5" />
        {signingIn ? 'Signing in…' : `Sign in to ${provider.label}`}
      </Button>
    );
  }

  const label = session.user?.email ?? session.user?.name ?? session.user?.sub ?? 'Signed in';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-3 text-foreground text-xs outline-none hover:bg-muted aria-expanded:bg-muted"
        aria-label={`${provider.label} account`}
      >
        <UserIcon className="h-3.5 w-3.5" />
        <span className="max-w-[180px] truncate">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => signOut(providerId)}>
          <LogOutIcon className="h-4 w-4" />
          Sign out of {provider.label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
