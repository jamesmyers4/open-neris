"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { upsertHazsit, type HazsitFormState } from "./actions";
import { TypeHazardDisposition } from "@/lib/neris/generated/enums";

function SaveButton({ justSaved }: { justSaved: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : justSaved ? "Saved ✓" : "Save hazsit details"}
    </button>
  );
}

export function HazsitForm({
  incidentId,
  initial,
  justSaved: justSavedFromServer,
}: {
  incidentId: string;
  initial: { hazsitDisposition: string; hazsitEvacuated: number | "" };
  justSaved: boolean;
}) {
  const initialState: HazsitFormState = {};
  const action = upsertHazsit.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const router = useRouter();
  const pathname = usePathname();
  const [justSaved, setJustSaved] = useState(justSavedFromServer);
  const wasJustSaved = useRef(justSavedFromServer);

  useEffect(() => {
    if (!wasJustSaved.current) return;
    router.replace(pathname, { scroll: false });
    const timer = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [pathname, router]);

  const [disposition, setDisposition] = useState(initial.hazsitDisposition);
  const [evacuated, setEvacuated] = useState(String(initial.hazsitEvacuated));

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

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Disposition
          <select
            name="hazsitDisposition"
            required
            value={disposition}
            onChange={(e) => setDisposition(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">—</option>
            {TypeHazardDisposition.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          People/businesses evacuated
          <input
            type="number"
            min={0}
            name="hazsitEvacuated"
            required
            value={evacuated}
            onChange={(e) => setEvacuated(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </div>

      <SaveButton justSaved={justSaved} />
    </form>
  );
}
