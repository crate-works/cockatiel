import { LogInIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { beginSignIn, useAuthStore } from '@/lib/auth';

export const SignInMenu = () => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const setStatus = useAuthStore((s) => s.setStatus);
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignIn = async () => {
    setStatus('signing-in');
    try {
      await beginSignIn();
      // beginSignIn calls window.location.assign — control transfers to the IdP.
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : String(err));
      toast.error(`Sign-in failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  if (status !== 'authenticated') {
    return (
      <Button variant="ghost" size="sm" onClick={handleSignIn} disabled={status === 'signing-in'} className="h-7 px-2 text-xs">
        <LogInIcon className="mr-1 h-3.5 w-3.5" />
        {status === 'signing-in' ? 'Signing in…' : 'Sign in'}
      </Button>
    );
  }

  const label = user?.name ?? user?.email ?? user?.sub ?? 'Account';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground text-xs outline-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted"
        aria-label="Account menu"
      >
        <UserIcon className="h-3.5 w-3.5" />
        <span className="max-w-[160px] truncate">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={signOut}>
          <LogOutIcon className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
