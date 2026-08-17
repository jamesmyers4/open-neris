"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateMutualAid, type MutualAidFormState } from "./actions";
import { TypeAid, TypeAidNonfd } from "@/lib/neris/generated/enums";
import { AID_NONE } from "@/lib/validation/incident-mutual-aid.schema";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save mutual aid"}
    </button>
  );
}

export function MutualAidForm({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: {
    aidDirection: string | null;
    aidType: string | null;
    aidDepartmentNames: string[];
    aidNonFdTypes: string[];
  };
}) {
  const initialState: MutualAidFormState = {};
  const action = updateMutualAid.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [direction, setDirection] = useState(initial.aidDirection ?? "");
  const [aidType, setAidType] = useState(initial.aidType ?? "");
  const [departmentNames, setDepartmentNames] = useState(initial.aidDepartmentNames.join("\n"));
  const [nonFdTypes, setNonFdTypes] = useState<string[]>(initial.aidNonFdTypes);

  const isNone = direction === AID_NONE;

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const handleDirectionChange = (value: string) => {
    setDirection(value);
    if (value === AID_NONE) {
      setAidType("");
      setDepartmentNames("");
      setNonFdTypes([]);
    }
  };

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
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Direction
            <select
              name="aidDirection"
              value={direction}
              onChange={(e) => handleDirectionChange(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">— Not yet answered</option>
              <option value={AID_NONE}>N/A — No mutual aid</option>
              <option value="GIVEN">Given</option>
              <option value="RECEIVED">Received</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Aid type
            <select
              name="aidType"
              value={aidType}
              onChange={(e) => setAidType(e.target.value)}
              disabled={isNone}
              className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">—</option>
              {TypeAid.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Fire department names (one per line)
            <textarea
              name="aidDepartmentNames"
              rows={3}
              value={departmentNames}
              onChange={(e) => setDepartmentNames(e.target.value)}
              disabled={isNone}
              className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-3" disabled={isNone}>
          <legend className="text-sm font-medium">Non-FD aid entities</legend>
          {TypeAidNonfd.map((type) => (
            <label key={type} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="aidNonFdTypes"
                value={type}
                checked={nonFdTypes.includes(type)}
                onChange={(e) =>
                  setNonFdTypes((v) => (e.target.checked ? [...v, type] : v.filter((t) => t !== type)))
                }
                disabled={isNone}
              />
              {type}
            </label>
          ))}
        </fieldset>
      </section>

      <SaveButton />
    </form>
  );
}
