import { createFileRoute } from '@tanstack/react-router';
import { AuthCallback } from '@/components/auth/AuthCallback';

const CallbackRoute = () => {
  const navigate = Route.useNavigate();
  return (
    <AuthCallback
      onDone={(returnTo) => {
        // returnTo is a validated router-relative path (may include a query); the
        // router parses and basepath-resolves it. replace so the callback URL is
        // not left in history.
        void navigate({ to: returnTo, replace: true });
      }}
    />
  );
};

export const Route = createFileRoute('/auth/callback')({
  component: CallbackRoute,
});
