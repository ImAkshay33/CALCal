import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  // Allow immediate app access in dev and guest mode while auth is pending
  return <>{children}</>;
}
