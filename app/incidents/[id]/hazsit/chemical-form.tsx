"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createHazardChemical, type CreateChemicalState } from "./actions";
import { TypeHazardDot, TypeHazardPhysicalState, TypeHazardReleasedInto, TypeHazardCause } from "@/lib/neris/generated/enums";
import { hazardUnitOptions } from "@/lib/neris/lookups";
import { RequiredFieldIndicator } from "@/components/RequiredFieldIndicator";
import { incidentHazardChemicalSchema } from "@/lib/validation/incident-hazsit.schema";
import { missingPaths } from "@/lib/validation/missing-paths";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Add chemical"}
    </button>
  );
}

export function ChemicalForm({ incidentId }: { incidentId: string }) {
  const initialState: CreateChemicalState = {};
  const action = createHazardChemical.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [dotClass, setDotClass] = useState("");
  const [chemicalName, setChemicalName] = useState("");
  const [releaseOccurred, setReleaseOccurred] = useState("");
  const [amountEst, setAmountEst] = useState("");
  const [amountEstUnits, setAmountEstUnits] = useState("");
  const [physicalState, setPhysicalState] = useState("");
  const [releaseInto, setReleaseInto] = useState("");
  const [releaseCause, setReleaseCause] = useState("");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const missing = missingPaths(incidentHazardChemicalSchema, {
    dotClass: dotClass || undefined,
    chemicalName: chemicalName || undefined,
    releaseOccurred: releaseOccurred === "" ? undefined : releaseOccurred === "true",
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

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Chemical name
          <RequiredFieldIndicator show={missing.has("chemicalName")} hint="required to add this chemical" />
          <input
            name="chemicalName"
            required
            maxLength={255}
            value={chemicalName}
            onChange={(e) => setChemicalName(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          DOT hazard class
          <RequiredFieldIndicator show={missing.has("dotClass")} hint="required to add this chemical" />
          <select
            name="dotClass"
            required
            value={dotClass}
            onChange={(e) => setDotClass(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">—</option>
            {TypeHazardDot.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Release occurred
          <RequiredFieldIndicator show={missing.has("releaseOccurred")} hint="required to add this chemical" />
          <select
            name="releaseOccurred"
            required
            value={releaseOccurred}
            onChange={(e) => setReleaseOccurred(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">—</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Release details</h2>
        <p className="text-xs text-slate-500">Applies when a release occurred.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Amount released
            <input
              type="number"
              min={0}
              step="any"
              name="amountEst"
              value={amountEst}
              onChange={(e) => setAmountEst(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Units
            <select
              name="amountEstUnits"
              value={amountEstUnits}
              onChange={(e) => setAmountEstUnits(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {hazardUnitOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.description}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Physical state
            <select
              name="physicalState"
              value={physicalState}
              onChange={(e) => setPhysicalState(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeHazardPhysicalState.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Released into
            <select
              name="releaseInto"
              value={releaseInto}
              onChange={(e) => setReleaseInto(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeHazardReleasedInto.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cause
            <select
              name="releaseCause"
              value={releaseCause}
              onChange={(e) => setReleaseCause(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeHazardCause.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <SubmitButton />
    </form>
  );
}
