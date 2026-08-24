"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateUserRole, deactivateUser, type UpdateUserRoleState, type DeactivateUserState } from "./actions";
import { UserRole } from "@prisma/client";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  departmentName: string;
};

function statusBadgeClass(status: string): string {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-800";
  if (status === "PENDING") return "bg-amber-50 text-amber-800";
  return "bg-slate-200 text-slate-600";
}

function statusLabel(status: string): string {
  if (status === "PENDING") return "Invited, pending";
  if (status === "DEACTIVATED") return "Deactivated";
  return "Active";
}

function RoleSelect({ user }: { user: UserRow }) {
  const initialState: UpdateUserRoleState = {};
  const action = updateUserRole.bind(null, user.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [role, setRole] = useState(user.role);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <select
        name="role"
        value={role}
        disabled={pending || user.status === "DEACTIVATED"}
        onChange={(e) => {
          setRole(e.target.value);
          e.target.form?.requestSubmit();
        }}
        className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
      >
        {Object.values(UserRole).map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {state.message && state.message !== "Role updated." && <p className="text-xs text-red-700">{state.message}</p>}
    </form>
  );
}

function DeactivateButton({ userId }: { userId: string }) {
  const initialState: DeactivateUserState = {};
  const [state, formAction, pending] = useActionState(deactivateUser, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className="text-xs text-red-700 underline disabled:opacity-50">
        {pending ? "Deactivating…" : "Deactivate"}
      </button>
      {state.message && state.message !== "User deactivated." && <p className="text-xs text-red-700">{state.message}</p>}
    </form>
  );
}

export function UsersList({
  users,
  currentUserId,
  showDepartmentColumn,
}: {
  users: UserRow[];
  currentUserId: string;
  showDepartmentColumn: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Department users</h2>
      {users.length === 0 ? (
        <p className="text-sm text-slate-500">No users yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              {showDepartmentColumn && <th className="py-2 pr-4">Department</th>}
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{u.name}</td>
                <td className="py-2 pr-4">{u.email}</td>
                {showDepartmentColumn && <td className="py-2 pr-4">{u.departmentName}</td>}
                <td className="py-2 pr-4">
                  <RoleSelect user={u} />
                </td>
                <td className="py-2 pr-4">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadgeClass(u.status)}`}>
                    {statusLabel(u.status)}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  {u.id !== currentUserId && u.status !== "DEACTIVATED" && <DeactivateButton userId={u.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
