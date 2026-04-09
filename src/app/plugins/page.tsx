import { AppShell } from '@/components/layout/app-shell';
import { requireAuth } from '@/server/auth/guards';
import { PluginsScreen } from '@/features/plugins/plugins-screen';

export default async function PluginsPage() {
  await requireAuth();

  return (
    <AppShell>
      <PluginsScreen />
    </AppShell>
  );
}
