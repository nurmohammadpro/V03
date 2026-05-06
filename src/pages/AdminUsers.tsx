import { AdminShell } from "@/components/admin/AdminShell";
import { UsersTable } from "@/components/dashboard/UsersTable";
import { useAdminRbac, useAdminUserProfiles, useAdminUsers } from "@/hooks/useDashboardData";

export default function AdminUsers() {
  const { users, loading } = useAdminUsers();
  const { profiles } = useAdminUserProfiles();
  const { roles, permissions } = useAdminRbac();

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

        <UsersTable users={users} loading={loading} />

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[8px] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-text)]">Profile review queue</p>
            <div className="mt-4 space-y-3">
              {profiles.map((profile) => (
                <div key={profile.id} className="rounded-[8px] bg-[var(--app-panel-2)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[var(--app-text)]">{profile.fullName}</p>
                      <p className="mt-1 text-sm text-[var(--app-text-muted)]">{profile.email}</p>
                    </div>
                    <span className="text-xs text-[var(--app-text-dim)]">{profile.subscription?.planName || "Free"}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Generations</p>
                      <p className="mt-2 text-sm text-[var(--app-text)]">{profile.usage.generationsThisMonth} this month</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Storage</p>
                      <p className="mt-2 text-sm text-[var(--app-text)]">{profile.usage.storageUsedGb} GB used</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Seats</p>
                      <p className="mt-2 text-sm text-[var(--app-text)]">{profile.usage.seats}</p>
                    </div>
                  </div>
                  {profile.notes.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {profile.notes.map((note) => (
                        <p key={note} className="text-sm leading-6 text-[var(--app-text-muted)]">
                          {note}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
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
