"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateNerisCredentials, type NerisCredentialsState } from "./actions";

type NerisEnvironment = "SANDBOX" | "PRODUCTION";

type CredentialsFields = {
  nerisVendorClientId: string | null;
  nerisEnvironment: NerisEnvironment;
  hasSecret: boolean;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Save NERIS credentials"}
    </button>
  );
}

export function NerisCredentialsForm({ credentials }: { credentials: CredentialsFields }) {
  const initialState: NerisCredentialsState = {};
  const [state, formAction] = useActionState(updateNerisCredentials, initialState);

  const [nerisVendorClientId, setNerisVendorClientId] = useState(credentials.nerisVendorClientId ?? "");
  const [nerisVendorClientSecret, setNerisVendorClientSecret] = useState("");
  const [nerisEnvironment, setNerisEnvironment] = useState<NerisEnvironment>(credentials.nerisEnvironment);

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  return (
    <form action={formAction} className="space-y-6">
      <h2 className="text-lg font-semibold">NERIS credentials</h2>
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Client ID
            <input
              name="nerisVendorClientId"
              value={nerisVendorClientId}
              onChange={(e) => setNerisVendorClientId(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Client secret
            <input
              type="password"
              name="nerisVendorClientSecret"
              value={nerisVendorClientSecret}
              onChange={(e) => setNerisVendorClientSecret(e.target.value)}
              placeholder={credentials.hasSecret ? "•••• set — leave blank to keep it" : "not set"}
              autoComplete="off"
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Environment
            <select
              name="nerisEnvironment"
              value={nerisEnvironment}
              onChange={(e) => setNerisEnvironment(e.target.value as NerisEnvironment)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="SANDBOX">Sandbox</option>
              <option value="PRODUCTION">Production</option>
            </select>
          </label>
        </div>
      </section>

      <SaveButton />
    </form>
  );
}
