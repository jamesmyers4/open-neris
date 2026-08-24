"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createInvite, type CreateInviteState } from "./actions";
import { UserRole } from "@prisma/client";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Sending…" : "Send invite"}
    </button>
  );
}

export function InviteForm({
  departments,
  ownDepartmentId,
}: {
  departments: { id: string; name: string }[];
  ownDepartmentId: string;
}) {
  const initialState: CreateInviteState = {};
  const [state, formAction] = useActionState(createInvite, initialState);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>(UserRole.MEMBER);
  const [departmentId, setDepartmentId] = useState(ownDepartmentId);

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-lg font-semibold">Invite a user</h2>
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Role
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        >
          {Object.values(UserRole).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      {departments.length > 1 && (
        <label className="flex flex-col gap-1 text-sm">
          Department
          <select
            name="departmentId"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {departments.length <= 1 && <input type="hidden" name="departmentId" value={ownDepartmentId} />}

      <SubmitButton />
    </form>
  );
}
