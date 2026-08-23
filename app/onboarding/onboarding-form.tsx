"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitOnboarding, type OnboardingState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Continuing…" : "Continue"}
    </button>
  );
}

export function OnboardingForm() {
  const initialState: OnboardingState = {};
  const [state, formAction] = useActionState(submitOnboarding, initialState);

  const [departmentName, setDepartmentName] = useState("");
  const [city, setCity] = useState("");
  const [state_, setState] = useState("");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  if (state.contactAdmin) {
    return (
      <div className="space-y-3 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p>
          This department already has an administrator: <strong>{state.contactAdmin.name}</strong> (
          {state.contactAdmin.email}).
        </p>
        <p>Contact them directly to request an invite — self-serve signup isn&apos;t available for a department that already has one.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Department name
        <input
          name="departmentName"
          required
          value={departmentName}
          onChange={(e) => setDepartmentName(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        City
        <input
          name="city"
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        State (2-letter)
        <input
          name="state"
          required
          maxLength={2}
          value={state_}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          className="rounded border border-slate-300 px-2 py-1 uppercase"
        />
      </label>

      <SubmitButton />
    </form>
  );
}
