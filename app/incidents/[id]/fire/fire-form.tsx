"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { upsertFire, type FireFormState } from "./actions";
import { RequiredFieldIndicator } from "@/components/RequiredFieldIndicator";
import { incidentFireRequiredSchema } from "@/lib/validation/incident-fire.schema";
import { missingPaths } from "@/lib/validation/missing-paths";
import {
  TypeSuppressAppliance,
  TypeWaterSupply,
  TypeFireInvestNeed,
  TypeFireInvest,
  TypeFireConditionArrival,
  TypeFireBldgDamage,
  TypeRoom,
  TypeFireCauseIn,
  TypeFireCauseOut,
} from "@/lib/neris/generated/enums";

function SaveButton({ justSaved }: { justSaved: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : justSaved ? "Saved ✓" : "Save fire details"}
    </button>
  );
}

type FireFormInitial = {
  fireSuppressionAppliance: string[];
  fireWaterSupply: string;
  fireInvestigationNeed: string;
  fireInvestigationType: string[];
  structureArrivalConditions: string;
  structureProgressionConditions: boolean | null;
  structureDamage: string;
  structureFloorOfOrigin: number | "";
  structureRoomOfOrigin: string;
  structureFireCause: string;
  outsideFireCause: string;
  outsideFireAcresBurned: number | "";
};

export function FireForm({
  incidentId,
  initial,
  justSaved: justSavedFromServer,
}: {
  incidentId: string;
  initial: FireFormInitial;
  justSaved: boolean;
}) {
  const initialState: FireFormState = {};
  const action = upsertFire.bind(null, incidentId);
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

  const [suppressionAppliance, setSuppressionAppliance] = useState<string[]>(initial.fireSuppressionAppliance);
  const [waterSupply, setWaterSupply] = useState(initial.fireWaterSupply);
  const [investigationNeed, setInvestigationNeed] = useState(initial.fireInvestigationNeed);
  const [investigationType, setInvestigationType] = useState<string[]>(initial.fireInvestigationType);
  const [arrivalConditions, setArrivalConditions] = useState(initial.structureArrivalConditions);
  const [progressionConditions, setProgressionConditions] = useState(
    initial.structureProgressionConditions === null ? "" : String(initial.structureProgressionConditions),
  );
  const [structureDamage, setStructureDamage] = useState(initial.structureDamage);
  const [floorOfOrigin, setFloorOfOrigin] = useState(String(initial.structureFloorOfOrigin));
  const [roomOfOrigin, setRoomOfOrigin] = useState(initial.structureRoomOfOrigin);
  const [structureFireCause, setStructureFireCause] = useState(initial.structureFireCause);
  const [outsideFireCause, setOutsideFireCause] = useState(initial.outsideFireCause);
  const [acresBurned, setAcresBurned] = useState(String(initial.outsideFireAcresBurned));

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const missing = missingPaths(incidentFireRequiredSchema, {
    fireInvestigationNeed: investigationNeed || undefined,
  });

  return (
    <form action={formAction} className="space-y-8">
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Suppression</h2>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="text-sm font-medium">Suppression appliance</legend>
          {TypeSuppressAppliance.map((v) => (
            <label key={v} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="fireSuppressionAppliance"
                value={v}
                checked={suppressionAppliance.includes(v)}
                onChange={(e) =>
                  setSuppressionAppliance((prev) => (e.target.checked ? [...prev, v] : prev.filter((x) => x !== v)))
                }
              />
              {v}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          Water supply
          <select
            name="fireWaterSupply"
            value={waterSupply}
            onChange={(e) => setWaterSupply(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">—</option>
            {TypeWaterSupply.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Investigation</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Investigation need
            <RequiredFieldIndicator show={missing.has("fireInvestigationNeed")} hint="required to submit" />
            <select
              name="fireInvestigationNeed"
              required
              value={investigationNeed}
              onChange={(e) => setInvestigationNeed(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeFireInvestNeed.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="text-sm font-medium">Investigation type</legend>
          {TypeFireInvest.map((v) => (
            <label key={v} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="fireInvestigationType"
                value={v}
                checked={investigationType.includes(v)}
                onChange={(e) =>
                  setInvestigationType((prev) => (e.target.checked ? [...prev, v] : prev.filter((x) => x !== v)))
                }
              />
              {v}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Structure fire</h2>
        <p className="text-xs text-slate-500">Applies when the incident involves a structure fire.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Arrival conditions
            <select
              name="structureArrivalConditions"
              value={arrivalConditions}
              onChange={(e) => setArrivalConditions(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeFireConditionArrival.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Progressed beyond arrival conditions
            <select
              name="structureProgressionConditions"
              value={progressionConditions}
              onChange={(e) => setProgressionConditions(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Building damage
            <select
              name="structureDamage"
              value={structureDamage}
              onChange={(e) => setStructureDamage(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeFireBldgDamage.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Floor of origin
            <input
              type="number"
              name="structureFloorOfOrigin"
              value={floorOfOrigin}
              onChange={(e) => setFloorOfOrigin(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Room of origin
            <select
              name="structureRoomOfOrigin"
              value={roomOfOrigin}
              onChange={(e) => setRoomOfOrigin(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeRoom.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Fire cause
            <select
              name="structureFireCause"
              value={structureFireCause}
              onChange={(e) => setStructureFireCause(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeFireCauseIn.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Outside fire</h2>
        <p className="text-xs text-slate-500">Applies when the incident involves an outside fire.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Fire cause
            <select
              name="outsideFireCause"
              value={outsideFireCause}
              onChange={(e) => setOutsideFireCause(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeFireCauseOut.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Acres burned
            <input
              type="number"
              min={0}
              step="any"
              name="outsideFireAcresBurned"
              value={acresBurned}
              onChange={(e) => setAcresBurned(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
      </section>

      <SaveButton justSaved={justSaved} />
    </form>
  );
}
