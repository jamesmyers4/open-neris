"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createUnitResponse, type CreateUnitResponseState } from "./actions";
import { TypeResponseMode } from "@/lib/neris/generated/enums";
import { DateTime24Field, isoToDateTimeValue, type DateTimeValue } from "@/components/DateTime24Field";
import { DateTimeQuickSelect } from "@/components/DateTimeQuickSelect";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Add unit"}
    </button>
  );
}

const emptyTime: DateTimeValue = { date: "", time: "" };

export function UnitResponseForm({
  incidentId,
  carryOver,
}: {
  incidentId: string;
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

  const [unitIdLinked, setUnitIdLinked] = useState("");
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

  const carryOverOptions = [
    { label: "Use alarm time", value: isoToDateTimeValue(carryOver.alarmTime) },
    { label: "Use call received at dispatch", value: isoToDateTimeValue(carryOver.dispatchTimeCallArrival) },
    { label: "Use call answered time", value: isoToDateTimeValue(carryOver.dispatchTimeCallAnswer) },
    { label: "Use call created time", value: isoToDateTimeValue(carryOver.dispatchTimeCallCreate) },
    { label: "Use incident clear time", value: isoToDateTimeValue(carryOver.timeIncidentClear) }
  ];

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
            Unit ID
            <input
              name="unitIdLinked"
              required
              value={unitIdLinked}
              onChange={(e) => setUnitIdLinked(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
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
  );
}
