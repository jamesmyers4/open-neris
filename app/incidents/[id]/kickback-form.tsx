"use client";

import { useState } from "react";
import { useActionState } from "react";
import { kickbackIncident, type KickbackState } from "./actions";

export function KickbackForm({ incidentId }: { incidentId: string }) {
  const initialState: KickbackState = {};
  const action = kickbackIncident.bind(null, incidentId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="text-xs text-red-700 underline">
        Kick back
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded border border-red-200 bg-red-50 p-3">
      {state.message && <p className="text-xs text-red-800">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <label className="flex flex-col gap-1 text-xs">
        Reason for kickback (required)
        <textarea
          name="note"
          required
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded bg-red-700 px-3 py-1 text-xs text-white disabled:opacity-50">
          {pending ? "Kicking back…" : "Confirm kickback"}
        </button>
        <button type="button" onClick={() => setExpanded(false)} className="text-xs text-slate-600 underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
