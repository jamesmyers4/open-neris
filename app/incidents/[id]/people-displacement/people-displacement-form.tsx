"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePeople, addDisplacement, type PeopleFormState, type AddDisplacementState } from "./actions";
import { TypeDisplaceCause } from "@/lib/neris/generated/enums";
import { RequiredFieldIndicator } from "@/components/RequiredFieldIndicator";
import { incidentDisplacementSchema } from "@/lib/validation/incident-people-displacement.schema";
import { missingPaths } from "@/lib/validation/missing-paths";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function PeopleForm({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: {
    incidentPeoplePresent: boolean | null;
    incidentRescueAnimal: number | null;
  };
}) {
  const initialState: PeopleFormState = {};
  const action = updatePeople.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [peoplePresent, setPeoplePresent] = useState(
    initial.incidentPeoplePresent === null ? "" : String(initial.incidentPeoplePresent),
  );
  const [rescueAnimal, setRescueAnimal] = useState(
    initial.incidentRescueAnimal === null ? "" : String(initial.incidentRescueAnimal),
  );

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
        <h2 className="font-semibold">People</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            People present at the incident
            <select
              name="incidentPeoplePresent"
              value={peoplePresent}
              onChange={(e) => setPeoplePresent(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Animals rescued
            <input
              type="number"
              min={0}
              name="incidentRescueAnimal"
              value={rescueAnimal}
              onChange={(e) => setRescueAnimal(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
      </section>

      <SaveButton label="Save" />
    </form>
  );
}

export function DisplacementForm({ incidentId }: { incidentId: string }) {
  const initialState: AddDisplacementState = {};
  const action = addDisplacement.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [causes, setCauses] = useState<string[]>([]);

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const missing = missingPaths(incidentDisplacementSchema, { causes });

  return (
    <form action={formAction} className="space-y-3 border-t border-slate-200 pt-6">
      <h2 className="font-semibold">Add displaced person</h2>
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-sm font-medium">
          Cause(s) for displacement
          <RequiredFieldIndicator show={missing.has("causes")} hint="pick at least one cause" />
        </legend>
        {TypeDisplaceCause.map((cause) => (
          <label key={cause} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              name="causes"
              value={cause}
              checked={causes.includes(cause)}
              onChange={(e) => setCauses((v) => (e.target.checked ? [...v, cause] : v.filter((c) => c !== cause)))}
            />
            {cause}
          </label>
        ))}
      </fieldset>
      <SaveButton label="Add displaced person" />
    </form>
  );
}
