"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateLocation, type LocationFormState } from "./actions";
import { TypeVacancy } from "@/lib/neris/generated/enums";
import type { LocationUseOption, LocPlaceOption } from "@/lib/neris/lookups";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Save location"}
    </button>
  );
}

export function LocationForm({
  incidentId,
  locationUseOptions,
  locPlaceOptions,
  initial,
}: {
  incidentId: string;
  locationUseOptions: LocationUseOption[];
  locPlaceOptions: LocPlaceOption[];
  initial: {
    streetAddressComplete: string;
    city: string;
    county: string;
    state: string;
    postalCode: string;
    country: string;
    place: string;
    useType: string;
    useSubtype: string;
    useVacancy: string;
  };
}) {
  const initialState: LocationFormState = {};
  const action = updateLocation.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [values, setValues] = useState(initial);

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValues(v => ({ ...v, [name]: value }));
  };

  const useTypeOptions = [...new Map(locationUseOptions.map(o => [o.value1, o.description1])).entries()];
  const useSubtypeOptions = locationUseOptions.filter(o => o.value1 === values.useType);

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
        <h2 className="font-semibold">Address</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Street address
            <input
              name="streetAddressComplete"
              required
              value={values.streetAddressComplete}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            City
            <input name="city" value={values.city} onChange={handleChange} className="rounded border border-slate-300 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            County
            <input name="county" value={values.county} onChange={handleChange} className="rounded border border-slate-300 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            State
            <input
              name="state"
              required
              maxLength={2}
              value={values.state}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1 uppercase"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Postal code
            <input name="postalCode" value={values.postalCode} onChange={handleChange} className="rounded border border-slate-300 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Country
            <input name="country" value={values.country} onChange={handleChange} className="rounded border border-slate-300 px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Place
            <select name="place" value={values.place} onChange={handleChange} className="rounded border border-slate-300 px-2 py-1">
              <option value="">—</option>
              {locPlaceOptions.map(o => (
                <option key={o.value} value={o.value}>
                  {o.description}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Location use</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Use type
            <select
              name="useType"
              value={values.useType}
              onChange={e => setValues(v => ({ ...v, useType: e.target.value, useSubtype: "" }))}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {useTypeOptions.map(([value, description]) => (
                <option key={value} value={value}>
                  {description}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Use subtype
            <select
              name="useSubtype"
              value={values.useSubtype}
              onChange={handleChange}
              disabled={!values.useType}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {useSubtypeOptions.map(o => (
                <option key={o.value2} value={o.value2}>
                  {o.description2}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Vacancy (if not in use)
            <select name="useVacancy" value={values.useVacancy} onChange={handleChange} className="rounded border border-slate-300 px-2 py-1">
              <option value="">—</option>
              {TypeVacancy.map(v => (
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
