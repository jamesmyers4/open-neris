"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createIncident, type CreateIncidentState } from "../actions";
import { TypeSpecialModifier } from "@/lib/neris/generated/enums";
import type { IncidentTypeOption } from "@/lib/neris/lookups";
import { DateTime24Field } from "@/components/DateTime24Field";

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
      {pending ? "Creating…" : "Create incident"}
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
}: {
  incidentTypeOptions: IncidentTypeOption[];
}) {
  const initialState: CreateIncidentState = {};
  const [state, formAction] = useActionState(createIncident, initialState);
  const [rows, setRows] = useState<TypeRow[]>([emptyRow]);
  const [specialModifiers, setSpecialModifiers] = useState<string[]>([]);
  const [alarmDate, setAlarmDate] = useState("");
  const [alarmTime, setAlarmTime] = useState("");

  const allErrors = state.errors
    ? Object.values(state.errors)
        .flat()
        .filter((e): e is string => Boolean(e))
    : [];

  const toggleSpecialModifier = (modifier: string) => {
    setSpecialModifiers((current) =>
      current.includes(modifier)
        ? current.filter((m) => m !== modifier)
        : [...current, modifier],
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
        <h2 className="font-semibold">Incident type</h2>
        <TypePicker
          options={incidentTypeOptions}
          rows={rows}
          setRows={setRows}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Special modifiers</h2>
        <fieldset className="flex flex-wrap gap-3">
          {TypeSpecialModifier.map((modifier) => (
            <label key={modifier} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="specialModifiers"
                value={modifier}
                checked={specialModifiers.includes(modifier)}
                onChange={() => toggleSpecialModifier(modifier)}
              />
              {modifier}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Alarm time</h2>
        <DateTime24Field
          label="Alarm time"
          fieldName="alarmTime"
          date={alarmDate}
          time={alarmTime}
          onDateChange={setAlarmDate}
          onTimeChange={setAlarmTime}
          required
        />
      </section>

      <SubmitButton />
    </form>
  );
}
