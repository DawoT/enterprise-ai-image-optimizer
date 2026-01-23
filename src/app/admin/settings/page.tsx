import SystemSettingsPanel from '@/components/admin/settings/SystemSettingsPanel';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  // Check authentication and admin role
  if (!session) {
    redirect('/api/auth/signin');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  return <SystemSettingsPanel />;
}
