"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createIncident, type CreateIncidentState } from "../actions";
import {
  TypeAid,
  TypeAidDirection,
  TypeAidNonfd,
  TypeDisplaceCause,
} from "@/lib/neris/generated/enums";
import type { IncidentTypeOption, LocPlaceOption } from "@/lib/neris/lookups";

type TypeRow = {
  value1: string;
  value2: string;
  value3: string;
  isPrimary: boolean;
};

const emptyRow: TypeRow = {
  value1: "",
  value2: "",
  value3: "",
  isPrimary: true,
};

type FormValues = {
  internalId: string;
  incidentDate: string;
  alarmTime: string;
  dispatchTimeCallCreate: string;
  dispatchTimeCallAnswer: string;
  dispatchTimeCallArrival: string;
  streetAddressComplete: string;
  city: string;
  county: string;
  state: string;
  postalCode: string;
  country: string;
  place: string;
  incidentPeoplePresent: string;
  incidentDisplacedNumber: string;
  incidentRescueAnimal: string;
  incidentNoActionReason: string;
  aidDirection: string;
  aidType: string;
  aidDepartmentNames: string;
  aidNonFdTypes: string;
  narrativeImpediment: string;
  narrativeOutcome: string;
};

const emptyValues: FormValues = {
  internalId: "",
  incidentDate: "",
  alarmTime: "",
  dispatchTimeCallCreate: "",
  dispatchTimeCallAnswer: "",
  dispatchTimeCallArrival: "",
  streetAddressComplete: "",
  city: "",
  county: "",
  state: "",
  postalCode: "",
  country: "US",
  place: "",
  incidentPeoplePresent: "",
  incidentDisplacedNumber: "",
  incidentRescueAnimal: "",
  incidentNoActionReason: "",
  aidDirection: "",
  aidType: "",
  aidDepartmentNames: "",
  aidNonFdTypes: "",
  narrativeImpediment: "",
  narrativeOutcome: "",
};

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : "Create incident"}
    </button>
  );
}

function TypePicker({
  options,
  rows,
  setRows,
}: {
  options: IncidentTypeOption[];
  rows: TypeRow[];
  setRows: (rows: TypeRow[]) => void;
}) {
  const value1Options = useMemo(
    () =>
      uniqueBy(options, (o) => o.value1).map((o) => ({
        value: o.value1,
        description: o.description1,
      })),
    [options],
  );

  const value2Options = (value1: string) =>
    uniqueBy(
      options.filter((o) => o.value1 === value1 && o.value2),
      (o) => o.value2,
    ).map((o) => ({ value: o.value2, description: o.description2 }));

  const value3Options = (value1: string, value2: string) =>
    options
      .filter((o) => o.value1 === value1 && o.value2 === value2 && o.value3)
      .map((o) => ({ value: o.value3, description: o.description3 }));

  const updateRow = (index: number, patch: Partial<TypeRow>) => {
    const next = rows.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    setRows(next);
  };

  const setPrimary = (index: number) => {
    setRows(rows.map((row, i) => ({ ...row, isPrimary: i === index })));
  };

  const addRow = () => {
    if (rows.length >= 3) return;
    setRows([
      ...rows,
      { value1: "", value2: "", value3: "", isPrimary: false },
    ]);
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((r) => r.isPrimary))
      next[0].isPrimary = true;
    setRows(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-2"
        >
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="primaryType"
              checked={row.isPrimary}
              onChange={() => setPrimary(i)}
            />
            Primary
          </label>
          <select
            className="rounded border border-slate-300 px-2 py-1"
            value={row.value1}
            onChange={(e) =>
              updateRow(i, { value1: e.target.value, value2: "", value3: "" })
            }
          >
            <option value="">Type…</option>
            {value1Options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.description}
              </option>
            ))}
          </select>
          {row.value1 && value2Options(row.value1).length > 0 && (
            <select
              className="rounded border border-slate-300 px-2 py-1"
              value={row.value2}
              onChange={(e) =>
                updateRow(i, { value2: e.target.value, value3: "" })
              }
            >
              <option value="">Category…</option>
              {value2Options(row.value1).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.description}
                </option>
              ))}
            </select>
          )}
          {row.value1 &&
            row.value2 &&
            value3Options(row.value1, row.value2).length > 0 && (
              <select
                className="rounded border border-slate-300 px-2 py-1"
                value={row.value3}
                onChange={(e) => updateRow(i, { value3: e.target.value })}
              >
                <option value="">Specific type…</option>
                {value3Options(row.value1, row.value2).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.description}
                  </option>
                ))}
              </select>
            )}
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-sm text-red-600"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {rows.length < 3 && (
        <button
          type="button"
          onClick={addRow}
          className="text-sm text-slate-600 underline"
        >
          Add another incident type
        </button>
      )}
    </div>
  );
}

export function IncidentForm({
  incidentTypeOptions,
  locPlaceOptions,
}: {
  incidentTypeOptions: IncidentTypeOption[];
  locPlaceOptions: LocPlaceOption[];
}) {
  const initialState: CreateIncidentState = {};
  const [state, formAction] = useActionState(createIncident, initialState);
  const [rows, setRows] = useState<TypeRow[]>([emptyRow]);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [causes, setCauses] = useState<string[]>([]);

  const allErrors = state.errors
    ? Object.values(state.errors)
        .flat()
        .filter((e): e is string => Boolean(e))
    : [];

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  };

  const toggleCause = (cause: string) => {
    setCauses((c) =>
      c.includes(cause) ? c.filter((x) => x !== cause) : [...c, cause],
    );
  };

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="typesJson"
        value={JSON.stringify(
          rows
            .filter((r) => r.value1)
            .map((r) => ({
              value1: r.value1,
              value2: r.value2 || undefined,
              value3: r.value3 || undefined,
              isPrimary: r.isPrimary,
            })),
        )}
      />

      {state.message && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">
          {state.message}
        </p>
      )}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Incident</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Internal ID
            <input
              name="internalId"
              required
              value={values.internalId}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Incident date
            <input
              type="date"
              name="incidentDate"
              required
              value={values.incidentDate}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Alarm time
            <input
              type="datetime-local"
              name="alarmTime"
              required
              value={values.alarmTime}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Incident type</h2>
        <TypePicker
          options={incidentTypeOptions}
          rows={rows}
          setRows={setRows}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Dispatch times</h2>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Call created
            <input
              type="datetime-local"
              name="dispatchTimeCallCreate"
              value={values.dispatchTimeCallCreate}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Call answered
            <input
              type="datetime-local"
              name="dispatchTimeCallAnswer"
              value={values.dispatchTimeCallAnswer}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Call arrival
            <input
              type="datetime-local"
              name="dispatchTimeCallArrival"
              value={values.dispatchTimeCallArrival}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Location</h2>
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
            <input
              name="city"
              value={values.city}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            County
            <input
              name="county"
              value={values.county}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
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
            <input
              name="postalCode"
              value={values.postalCode}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Country
            <input
              name="country"
              value={values.country}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Place
            <select
              name="place"
              value={values.place}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {locPlaceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.description}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">People and displacement</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            People present
            <select
              name="incidentPeoplePresent"
              value={values.incidentPeoplePresent}
              onChange={handleChange}
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
              name="incidentDisplacedNumber"
              value={values.incidentDisplacedNumber}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Animals rescued
            <input
              type="number"
              min={0}
              name="incidentRescueAnimal"
              value={values.incidentRescueAnimal}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="text-sm font-medium">Displacement causes</legend>
          {TypeDisplaceCause.map((cause) => (
            <label key={cause} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="incidentDisplacedCauses"
                value={cause}
                checked={causes.includes(cause)}
                onChange={() => toggleCause(cause)}
              />
              {cause}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          No-action reason
          <input
            name="incidentNoActionReason"
            value={values.incidentNoActionReason}
            onChange={handleChange}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Mutual aid</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Aid direction
            <select
              name="aidDirection"
              value={values.aidDirection}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeAidDirection.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Aid type
            <select
              name="aidType"
              value={values.aidType}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeAid.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Aid department names (comma-separated)
            <input
              name="aidDepartmentNames"
              value={values.aidDepartmentNames}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Non-FD aid types (comma-separated: {TypeAidNonfd.join(", ")})
            <input
              name="aidNonFdTypes"
              value={values.aidNonFdTypes}
              onChange={handleChange}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Narrative</h2>
        <label className="flex flex-col gap-1 text-sm">
          Impediment
          <textarea
            name="narrativeImpediment"
            rows={3}
            value={values.narrativeImpediment}
            onChange={handleChange}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Outcome
          <textarea
            name="narrativeOutcome"
            rows={3}
            value={values.narrativeOutcome}
            onChange={handleChange}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </section>

      <SubmitButton />
    </form>
  );
}
