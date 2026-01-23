import SystemBillingPanel from '@/components/admin/billing/SystemBillingPanel';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function BillingPage() {
  const session = await getServerSession(authOptions);

  // Check authentication and admin role
  if (!session) {
    redirect('/api/auth/signin');
  }

  // Allow all authenticated users to view their own billing
  // Admin role check is handled within the component

  return <SystemBillingPanel />;
}
