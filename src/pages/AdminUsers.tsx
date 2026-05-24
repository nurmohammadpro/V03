import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { UsersTable } from "@/components/dashboard/UsersTable";
import {
  useAdminRbac,
  useAdminUserProfile,
  useAdminUsers,
  useAssignAdminRole,
  useUpdateAdminUserPlan,
  useUpdateAdminUserStatus,
} from "@/hooks/useDashboardData";
import type { User } from "@/lib/types";

export default function AdminUsers() {
  const { users, loading } = useAdminUsers();
  const { roles, permissions } = useAdminRbac();
  const updateStatus = useUpdateAdminUserStatus();
  const updatePlan = useUpdateAdminUserPlan();
  const assignRole = useAssignAdminRole();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { profile: selectedProfile } = useAdminUserProfile(selectedUserId);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const supportAdminRole = roles.find((role) => role.key === "support_admin") ?? roles[0];

  async function handleToggleStatus(user: User) {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    try {
      await updateStatus.mutateAsync({ userId: user.id, status: nextStatus });
      toast.success(`${user.email} is now ${nextStatus}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update user status.");
    }
  }

  async function handleChangePlan(user: User, planKey: string) {
    try {
      await updatePlan.mutateAsync({ userId: user.id, planKey });
      toast.success(`${user.email} moved to ${planKey}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change plan.");
    }
  }

  async function handleAssignAdminRole(user: User) {
    if (!supportAdminRole) {
      toast.error("No admin role is available to assign yet.");
      return;
    }

    try {
      await assignRole.mutateAsync({ userId: user.id, roleId: supportAdminRole.id });
      toast.success(`${user.email} received ${supportAdminRole.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign admin role.");
    }
  }

  return (
    <AdminShell title="Users" subtitle="Account controls, plan changes, and role-based admin access.">
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[8px] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-text)]">User operations</p>
            <p className="mt-2 max-w-[58ch] text-sm leading-6 text-[var(--app-text-muted)]">
              This surface is where support and ops can suspend access, inspect profile state, and change plan posture without crossing into billing or AI settings.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Active", value: users.filter((user) => user.status === "active").length },
                { label: "Suspended", value: users.filter((user) => user.status === "suspended").length },
                { label: "Admins", value: users.filter((user) => user.role === "admin").length },
              ].map((item) => (
                <div key={item.label} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{item.label}</p>
                  <p className="mt-3 text-[20px] text-[var(--app-text)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-text)]">Role policy</p>
            <div className="mt-4 space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[var(--app-text)]">{role.name}</p>
                      <p className="mt-1 text-sm text-[var(--app-text-muted)]">{role.description}</p>
                    </div>
                    <span className="text-xs text-[var(--app-text-dim)]">{role.permissionIds.length} permissions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <UsersTable
          users={users}
          loading={loading}
          onViewProfile={(user) => setSelectedUserId(user.id)}
          onToggleStatus={handleToggleStatus}
          onUpgradePlan={(user) => handleChangePlan(user, user.plan === "starter" ? "professional" : "enterprise")}
          onDowngradePlan={(user) => handleChangePlan(user, user.plan === "enterprise" ? "professional" : "starter")}
          onAssignAdminRole={handleAssignAdminRole}
        />

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[8px] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-text)]">Profile review queue</p>
            {selectedProfile ? (
              <div className="mt-4 rounded-[8px] bg-[var(--app-panel-2)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--app-text)]">{selectedProfile.fullName}</p>
                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">{selectedProfile.email}</p>
                  </div>
                  <span className="text-xs text-[var(--app-text-dim)]">{selectedProfile.subscription?.planName || "Free"}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Generations</p>
                    <p className="mt-2 text-sm text-[var(--app-text)]">{selectedProfile.usage.generationsThisMonth} this month</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Storage</p>
                    <p className="mt-2 text-sm text-[var(--app-text)]">{selectedProfile.usage.storageUsedGb} GB used</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Seats</p>
                    <p className="mt-2 text-sm text-[var(--app-text)]">{selectedProfile.usage.seats}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {selectedProfile.notes.map((note) => (
                    <p key={note} className="text-sm leading-6 text-[var(--app-text-muted)]">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--app-text-muted)]">Select a user to inspect profile state.</p>
            )}
          </div>

          <div className="rounded-[8px] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-text)]">Permission surface</p>
            <div className="mt-4 space-y-3">
              {permissions.map((permission) => (
                <div key={permission.id} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-[var(--app-text)]">{permission.name}</p>
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{permission.scope}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">{permission.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
