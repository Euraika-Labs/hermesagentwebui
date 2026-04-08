import { AppShell } from '@/components/layout/app-shell';
import { requireAuth } from '@/server/auth/guards';
import { MarketplaceScreen } from '@/features/marketplace/marketplace-screen';

export default async function MarketplacePage() {
  await requireAuth();

  return (
    <AppShell>
      <MarketplaceScreen />
    </AppShell>
  );
}
