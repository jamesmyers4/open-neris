"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createExposure, type CreateExposureState } from "../actions";
import { TypeDisplaceCause, TypeExposureDamage, TypeExposureItem, TypeExposureLoc } from "@/lib/neris/generated/enums";
import { RequiredFieldIndicator } from "@/components/RequiredFieldIndicator";
import { incidentExposureSchema } from "@/lib/validation/incident-exposure.schema";
import { missingPaths } from "@/lib/validation/missing-paths";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Add exposure"}
    </button>
  );
}

export function ExposureForm({ incidentId }: { incidentId: string }) {
  const initialState: CreateExposureState = {};
  const action = createExposure.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [exposureType, setExposureType] = useState("");
  const [exposureItem, setExposureItem] = useState("");
  const [exposureDamage, setExposureDamage] = useState("");
  const [peoplePresent, setPeoplePresent] = useState("");
  const [displacedNumber, setDisplacedNumber] = useState("");
  const [displacedCauses, setDisplacedCauses] = useState<string[]>([]);

  const isExternal = exposureType === "EXTERNAL_EXPOSURE";

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const missing = missingPaths(incidentExposureSchema, {
    exposureType: exposureType || undefined,
    exposureItem: exposureItem || undefined,
    exposureDamage: exposureDamage || undefined,
    exposurePeoplePresent: peoplePresent === "" ? undefined : peoplePresent === "true",
    exposureDisplacedNumber: displacedNumber === "" ? undefined : Number(displacedNumber),
    exposureDisplacedCauses: displacedCauses,
  });

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
            Exposure type
            <RequiredFieldIndicator show={missing.has("exposureType")} hint="required to add this exposure" />
            <select
              name="exposureType"
              required
              value={exposureType}
              onChange={(e) => {
                setExposureType(e.target.value);
                if (e.target.value !== "EXTERNAL_EXPOSURE") setExposureItem("");
              }}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeExposureLoc.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Exposure item
            <RequiredFieldIndicator show={missing.has("exposureItem")} hint="required for an external exposure" />
            <select
              name="exposureItem"
              required={isExternal}
              disabled={!isExternal}
              value={exposureItem}
              onChange={(e) => setExposureItem(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">—</option>
              {TypeExposureItem.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Damage
            <RequiredFieldIndicator show={missing.has("exposureDamage")} hint="required to add this exposure" />
            <select
              name="exposureDamage"
              required
              value={exposureDamage}
              onChange={(e) => setExposureDamage(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeExposureDamage.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            People present
            <select
              name="exposurePeoplePresent"
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
            Number displaced
            <input
              type="number"
              min={0}
              name="exposureDisplacedNumber"
              value={displacedNumber}
              onChange={(e) => setDisplacedNumber(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="text-sm font-medium">
            Displacement causes
            <RequiredFieldIndicator
              show={missing.has("exposureDisplacedCauses")}
              hint="required when a displaced number is recorded"
            />
          </legend>
          {TypeDisplaceCause.map((cause) => (
            <label key={cause} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="exposureDisplacedCauses"
                value={cause}
                checked={displacedCauses.includes(cause)}
                onChange={(e) =>
                  setDisplacedCauses((v) => (e.target.checked ? [...v, cause] : v.filter((c) => c !== cause)))
                }
              />
              {cause}
            </label>
          ))}
        </fieldset>
      </section>

      <SubmitButton />
    </form>
  );
}
