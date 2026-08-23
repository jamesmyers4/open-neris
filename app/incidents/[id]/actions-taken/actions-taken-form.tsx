"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setNoActionReason, addActionTaken, type NoActionFormState, type AddActionTakenState } from "./actions";
import { TypeNoaction } from "@/lib/neris/generated/enums";
import type { ActionTacticOption } from "@/lib/neris/lookups";
import { RequiredFieldIndicator } from "@/components/RequiredFieldIndicator";
import { incidentActionsTakenRequiredSchema } from "@/lib/validation/incident-actions-taken.schema";
import { missingPaths } from "@/lib/validation/missing-paths";

function SaveButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function NoActionForm({
  incidentId,
  initial,
  blocked,
  hasActionsTaken,
}: {
  incidentId: string;
  initial: string | null;
  blocked: boolean;
  hasActionsTaken: boolean;
}) {
  const initialState: NoActionFormState = {};
  const action = setNoActionReason.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);
  const [reason, setReason] = useState(initial ?? "");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const missing = missingPaths(incidentActionsTakenRequiredSchema, {
    hasActionsTaken,
    incidentNoActionReason: reason || null,
  });

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="font-semibold">No action taken</h2>
      {blocked && (
        <p className="rounded bg-slate-50 p-3 text-sm text-slate-600">
          Remove all actions taken entries below before selecting a no-action reason.
        </p>
      )}
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Reason
        <RequiredFieldIndicator
          show={missing.has("incidentActionsTaken")}
          hint="pick a reason, or add an action taken below"
        />
        <select
          name="incidentNoActionReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={blocked}
          className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">— Not yet answered</option>
          {TypeNoaction.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <SaveButton label="Save no-action reason" disabled={blocked} />
    </form>
  );
}

export function AddActionTakenForm({
  incidentId,
  actionTacticOptions,
  blocked,
}: {
  incidentId: string;
  actionTacticOptions: ActionTacticOption[];
  blocked: boolean;
}) {
  const initialState: AddActionTakenState = {};
  const action = addActionTaken.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const value1Options = [...new Map(actionTacticOptions.map((o) => [o.value1, o.description1])).entries()];
  const value2Options = actionTacticOptions.filter((o) => o.value1 === value1);

  return (
    <form action={formAction} className="space-y-3 border-t border-slate-200 pt-6">
      <h2 className="font-semibold">Add action taken</h2>
      {blocked && (
        <p className="rounded bg-slate-50 p-3 text-sm text-slate-600">
          Clear the no-action reason above before adding actions taken.
        </p>
      )}
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Action
          <select
            name="value1"
            value={value1}
            onChange={(e) => {
              setValue1(e.target.value);
              setValue2("");
            }}
            disabled={blocked}
            className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">—</option>
            {value1Options.map(([value, description]) => (
              <option key={value} value={value}>
                {description}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tactic
          <select
            name="value2"
            value={value2}
            onChange={(e) => setValue2(e.target.value)}
            disabled={blocked || !value1}
            className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">—</option>
            {value2Options.map((o) => (
              <option key={o.value2} value={o.value2}>
                {o.description2}
              </option>
            ))}
          </select>
        </label>
      </div>
      <SaveButton label="Add action taken" disabled={blocked} />
    </form>
  );
}
