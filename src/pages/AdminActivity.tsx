import { AdminShell } from "@/components/admin/AdminShell";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useActivityFeed } from "@/hooks/useDashboardData";

export default function AdminActivity() {
  const { activities, loading } = useActivityFeed();

  return (
    <AdminShell
      title="Activity"
      subtitle="Recent platform events across user, generation, export, and failure flows."
    >
      <ActivityFeed activities={activities} loading={loading} title="Platform activity" maxItems={20} />
    </AdminShell>
  );
}
