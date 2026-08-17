"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateNarrative, type NarrativeFormState } from "./actions";

const NARRATIVE_MAX = 100000;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save narrative"}
    </button>
  );
}

export function NarrativeForm({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: {
    narrativeImpediment: string | null;
    narrativeOutcome: string | null;
  };
}) {
  const initialState: NarrativeFormState = {};
  const action = updateNarrative.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [impediment, setImpediment] = useState(initial.narrativeImpediment ?? "");
  const [outcome, setOutcome] = useState(initial.narrativeOutcome ?? "");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  return (
    <form action={formAction} className="space-y-6">
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <label className="flex flex-col gap-1 text-sm">
          Impediment
          <span className="text-xs text-slate-500">Any obstacles that impacted the incident.</span>
          <textarea
            name="narrativeImpediment"
            rows={5}
            maxLength={NARRATIVE_MAX}
            value={impediment}
            onChange={(e) => setImpediment(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
          <span className="self-end text-xs text-slate-400">
            {impediment.length.toLocaleString()} / {NARRATIVE_MAX.toLocaleString()}
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Outcome
          <span className="text-xs text-slate-500">The final disposition of the incident.</span>
          <textarea
            name="narrativeOutcome"
            rows={5}
            maxLength={NARRATIVE_MAX}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
          <span className="self-end text-xs text-slate-400">
            {outcome.length.toLocaleString()} / {NARRATIVE_MAX.toLocaleString()}
          </span>
        </label>
      </section>

      <SaveButton />
    </form>
  );
}
