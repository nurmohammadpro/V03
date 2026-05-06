import { AdminShell } from "@/components/admin/AdminShell";
import { UsersTable } from "@/components/dashboard/UsersTable";
import { useAdminUsers } from "@/hooks/useDashboardData";

export default function AdminUsers() {
  const { users, loading } = useAdminUsers();

  return (
    <AdminShell
      title="Users"
      subtitle="Account status, role assignment, and user-level review."
    >
      <div className="space-y-6">
        <section className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl">
          <p className="text-sm font-medium text-[var(--app-text)]">User operations</p>
          <p className="mt-2 max-w-[56ch] text-sm font-light leading-6 text-[var(--app-text-muted)]">
            Review account states, filter by role, and inspect status before taking account actions.
          </p>
        </section>
        <UsersTable users={users} loading={loading} />
      </div>
    </AdminShell>
  );
}
