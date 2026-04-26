import { Sidebar } from '@/components/layout/sidebar';
import { requireAuth, getUserProfile } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  const profile = await getUserProfile();
  const email = profile?.email ?? '';
  const fullName = profile?.full_name ?? email.split('@')[0] ?? '';

  return (
    <div className="flex h-screen">
      <Sidebar userEmail={email} userFullName={fullName} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
