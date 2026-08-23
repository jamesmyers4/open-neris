"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createUnitResponse, quickAddUnit, type CreateUnitResponseState, type QuickAddUnitState } from "./actions";
import { TypeResponseMode } from "@/lib/neris/generated/enums";
import { unitCapabilityOptions } from "@/lib/neris/lookups";
import { DateTime24Field, isoToDateTimeValue, type DateTimeValue } from "@/components/DateTime24Field";
import { DateTimeQuickSelect } from "@/components/DateTimeQuickSelect";
import { RequiredFieldIndicator } from "@/components/RequiredFieldIndicator";
import { incidentUnitResponseSchema } from "@/lib/validation/incident-unit-response.schema";
import { missingPaths } from "@/lib/validation/missing-paths";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Add unit"}
    </button>
  );
}

function QuickAddSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-700 px-3 py-1 text-sm text-white disabled:opacity-50">
      {pending ? "Creating…" : "Create unit"}
    </button>
  );
}

type UnitOption = { id: string; designation: string; stationLabel: string };

function QuickAddUnit({
  incidentId,
  onCreated,
  onCancel,
  dismissable,
}: {
  incidentId: string;
  onCreated: (unit: { id: string; designation: string }) => void;
  onCancel: () => void;
  dismissable: boolean;
}) {
  const initialState: QuickAddUnitState = {};
  const action = quickAddUnit.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);
  const [designation, setDesignation] = useState("");
  const [capabilityType, setCapabilityType] = useState("");

  useEffect(() => {
    if (state.unit) onCreated(state.unit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.unit]);

  const errors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  return (
    <form action={formAction} className="space-y-2 rounded border border-slate-300 bg-slate-50 p-3">
      {state.message && <p className="text-xs text-amber-900">{state.message}</p>}
      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-red-800">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs">
          Unit designation
          <input
            name="designation"
            required
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Capability type
          <select
            name="capabilityType"
            value={capabilityType}
            onChange={(e) => setCapabilityType(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="">—</option>
            {unitCapabilityOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.description}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <QuickAddSubmitButton />
        {dismissable && (
          <button type="button" onClick={onCancel} className="rounded px-3 py-1 text-sm text-slate-600 underline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

const emptyTime: DateTimeValue = { date: "", time: "" };

export function UnitResponseForm({
  incidentId,
  units,
  carryOver,
}: {
  incidentId: string;
  units: UnitOption[];
  carryOver: {
    alarmTime: string;
    dispatchTimeCallArrival: string | null;
    dispatchTimeCallAnswer: string | null;
    dispatchTimeCallCreate: string | null;
    timeIncidentClear: string | null;
  };
}) {
  const initialState: CreateUnitResponseState = {};
  const action = createUnitResponse.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [unitOptions, setUnitOptions] = useState<UnitOption[]>(units);
  const [unitIdLinked, setUnitIdLinked] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(units.length === 0);
  const [unitIdReported, setUnitIdReported] = useState("");
  const [unitStaffingReported, setUnitStaffingReported] = useState("");
  const [unableToDispatch, setUnableToDispatch] = useState("");
  const [responseMode, setResponseMode] = useState("");
  const [transportMode, setTransportMode] = useState("");

  const [dispatch, setDispatch] = useState<DateTimeValue>(emptyTime);
  const [enroute, setEnroute] = useState<DateTimeValue>(emptyTime);
  const [onScene, setOnScene] = useState<DateTimeValue>(emptyTime);
  const [canceledEnroute, setCanceledEnroute] = useState<DateTimeValue>(emptyTime);
  const [staging, setStaging] = useState<DateTimeValue>(emptyTime);
  const [unitClear, setUnitClear] = useState<DateTimeValue>(emptyTime);

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const missing = missingPaths(incidentUnitResponseSchema, {
    unitIdLinked: unitIdLinked || undefined,
  });

  const carryOverOptions = [
    { label: "Use alarm time", value: isoToDateTimeValue(carryOver.alarmTime) },
    { label: "Use call received at dispatch", value: isoToDateTimeValue(carryOver.dispatchTimeCallArrival) },
    { label: "Use call answered time", value: isoToDateTimeValue(carryOver.dispatchTimeCallAnswer) },
    { label: "Use call created time", value: isoToDateTimeValue(carryOver.dispatchTimeCallCreate) },
    { label: "Use incident clear time", value: isoToDateTimeValue(carryOver.timeIncidentClear) }
  ];

  return (
    <div className="space-y-4">
      {showQuickAdd && (
        <QuickAddUnit
          incidentId={incidentId}
          dismissable={unitOptions.length > 0}
          onCancel={() => setShowQuickAdd(false)}
          onCreated={(unit) => {
            setUnitOptions((prev) => [...prev, { id: unit.id, designation: unit.designation, stationLabel: "" }]);
            setUnitIdLinked(unit.id);
            setShowQuickAdd(false);
          }}
        />
      )}

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
            <div className="col-span-2 flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm">
                Unit
                <RequiredFieldIndicator show={missing.has("unitIdLinked")} hint="required to add this unit" />
                <select
                  name="unitIdLinked"
                  required
                  value={unitIdLinked}
                  onChange={(e) => setUnitIdLinked(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1"
                >
                  <option value="">
                    {unitOptions.length === 0 ? "No units set up yet — quick-add one below" : "— select a unit —"}
                  </option>
                  {unitOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.stationLabel ? `${u.designation} (${u.stationLabel})` : u.designation}
                    </option>
                  ))}
                </select>
              </label>
              {!showQuickAdd && (
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="w-fit text-xs text-slate-600 underline"
                >
                  + Quick-add a unit
                </button>
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Reported unit ID
              <input
                name="unitIdReported"
                maxLength={255}
                value={unitIdReported}
                onChange={(e) => setUnitIdReported(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              On-scene staffing
              <input
                type="number"
                min={0}
                name="unitStaffingReported"
                value={unitStaffingReported}
                onChange={(e) => setUnitStaffingReported(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Unable to dispatch
              <select
                name="unableToDispatch"
                value={unableToDispatch}
                onChange={(e) => setUnableToDispatch(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Response mode
              <select
                name="responseMode"
                value={responseMode}
                onChange={(e) => setResponseMode(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              >
                <option value="">—</option>
                {TypeResponseMode.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Transport mode
              <select
                name="transportMode"
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              >
                <option value="">—</option>
                {TypeResponseMode.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Times</h3>
          <div className="flex flex-col gap-3">
            <DateTime24Field
              label="Dispatched"
              fieldName="timeDispatch"
              date={dispatch.date}
              time={dispatch.time}
              onDateChange={(d) => setDispatch((v) => ({ ...v, date: d }))}
              onTimeChange={(t) => setDispatch((v) => ({ ...v, time: t }))}
            />
            <DateTimeQuickSelect options={carryOverOptions} onSelect={setDispatch} />
            <DateTime24Field
              label="En route to scene"
              fieldName="timeEnrouteToScene"
              date={enroute.date}
              time={enroute.time}
              onDateChange={(d) => setEnroute((v) => ({ ...v, date: d }))}
              onTimeChange={(t) => setEnroute((v) => ({ ...v, time: t }))}
            />
            <DateTimeQuickSelect options={carryOverOptions} onSelect={setEnroute} />
            <DateTime24Field
              label="On scene"
              fieldName="timeOnScene"
              date={onScene.date}
              time={onScene.time}
              onDateChange={(d) => setOnScene((v) => ({ ...v, date: d }))}
              onTimeChange={(t) => setOnScene((v) => ({ ...v, time: t }))}
            />
            <DateTimeQuickSelect options={carryOverOptions} onSelect={setOnScene} />
            <DateTime24Field
              label="Staging"
              fieldName="timeStaging"
              date={staging.date}
              time={staging.time}
              onDateChange={(d) => setStaging((v) => ({ ...v, date: d }))}
              onTimeChange={(t) => setStaging((v) => ({ ...v, time: t }))}
            />
            <DateTimeQuickSelect options={carryOverOptions} onSelect={setStaging} />
            <DateTime24Field
              label="Canceled en route"
              fieldName="timeCanceledEnroute"
              date={canceledEnroute.date}
              time={canceledEnroute.time}
              onDateChange={(d) => setCanceledEnroute((v) => ({ ...v, date: d }))}
              onTimeChange={(t) => setCanceledEnroute((v) => ({ ...v, time: t }))}
            />
            <DateTimeQuickSelect options={carryOverOptions} onSelect={setCanceledEnroute} />
            <DateTime24Field
              label="Unit clear"
              fieldName="timeUnitClear"
              date={unitClear.date}
              time={unitClear.time}
              onDateChange={(d) => setUnitClear((v) => ({ ...v, date: d }))}
              onTimeChange={(t) => setUnitClear((v) => ({ ...v, time: t }))}
            />
            <DateTimeQuickSelect
              options={[...carryOverOptions, { label: "Use on-scene time", value: onScene }]}
              onSelect={setUnitClear}
            />
          </div>
        </section>

        <SubmitButton />
      </form>
    </div>
  );
}
