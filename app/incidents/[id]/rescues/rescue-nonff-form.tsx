"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createRescueNonFf, type CreateRescueState } from "./actions";
import { CheckboxGroup } from "./checkbox-group";
import { RequiredFieldIndicator } from "@/components/RequiredFieldIndicator";
import { incidentRescueNonFfSchema } from "@/lib/validation/incident-rescue.schema";
import { missingPaths } from "@/lib/validation/missing-paths";
import {
  TypeGender,
  TypeRace,
  TypeRescue,
  TypeRescuePresenceKnown,
  TypeRescueMode,
  TypeRescueAction,
  TypeRescueImpediment,
  TypeRoom,
  TypeRescueElevation,
  TypeRescuePath,
  TypeSuppressTime,
  TypeCasualty,
  TypeCasualtyCause,
} from "@/lib/neris/generated/enums";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Add non-firefighter casualty"}
    </button>
  );
}

export function RescueNonFfForm({ incidentId }: { incidentId: string }) {
  const initialState: CreateRescueState = {};
  const action = createRescueNonFf.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [birthMonthYear, setBirthMonthYear] = useState("");
  const [gender, setGender] = useState("");
  const [race, setRace] = useState("");
  const [rescueType, setRescueType] = useState("");
  const [presenceKnown, setPresenceKnown] = useState("");
  const [primaryMode, setPrimaryMode] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [impedimentTypes, setImpedimentTypes] = useState<string[]>([]);
  const [roomType, setRoomType] = useState("");
  const [elevationType, setElevationType] = useState("");
  const [gasIsolation, setGasIsolation] = useState("");
  const [removalPathType, setRemovalPathType] = useState("");
  const [fireRelativeTime, setFireRelativeTime] = useState("");
  const [casualtyType, setCasualtyType] = useState("");
  const [casualtyCause, setCasualtyCause] = useState("");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const missing = missingPaths(incidentRescueNonFfSchema, {
    rescueType: rescueType || undefined,
    casualtyType: casualtyType || undefined,
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
        <h3 className="text-sm font-medium">Person</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Birth month/year
            <input
              name="birthMonthYear"
              placeholder="MM/YYYY"
              value={birthMonthYear}
              onChange={(e) => setBirthMonthYear(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Gender
            <select name="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
              <option value="">—</option>
              {TypeGender.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Race
            <select name="race" value={race} onChange={(e) => setRace(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
              <option value="">—</option>
              {TypeRace.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Rescue</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Rescue type
            <RequiredFieldIndicator show={missing.has("rescueType")} hint="required to add this casualty" />
            <select
              name="rescueType"
              required
              value={rescueType}
              onChange={(e) => setRescueType(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeRescue.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Presence known
            <select
              name="presenceKnown"
              value={presenceKnown}
              onChange={(e) => setPresenceKnown(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeRescuePresenceKnown.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Primary mode
            <select
              name="primaryMode"
              value={primaryMode}
              onChange={(e) => setPrimaryMode(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeRescueMode.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <CheckboxGroup legend="Actions" name="actions" options={TypeRescueAction} values={actions} onChange={setActions} />
        <CheckboxGroup
          legend="Impediment types"
          name="impedimentTypes"
          options={TypeRescueImpediment}
          values={impedimentTypes}
          onChange={setImpedimentTypes}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Removal from structure</h3>
        <p className="text-xs text-slate-500">Applies when the primary mode was removal from a structure.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Room type
            <select name="roomType" value={roomType} onChange={(e) => setRoomType(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
              <option value="">—</option>
              {TypeRoom.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Elevation
            <select
              name="elevationType"
              value={elevationType}
              onChange={(e) => setElevationType(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeRescueElevation.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Gas isolation
            <select
              name="gasIsolation"
              value={gasIsolation}
              onChange={(e) => setGasIsolation(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Removal path
            <select
              name="removalPathType"
              value={removalPathType}
              onChange={(e) => setRemovalPathType(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeRescuePath.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Fire relative time
            <select
              name="fireRelativeTime"
              value={fireRelativeTime}
              onChange={(e) => setFireRelativeTime(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeSuppressTime.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Casualty</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Casualty type
            <RequiredFieldIndicator show={missing.has("casualtyType")} hint="required to add this casualty" />
            <select
              name="casualtyType"
              required
              value={casualtyType}
              onChange={(e) => setCasualtyType(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeCasualty.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cause
            <select
              name="casualtyCause"
              value={casualtyCause}
              onChange={(e) => setCasualtyCause(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeCasualtyCause.map((v) => (
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
