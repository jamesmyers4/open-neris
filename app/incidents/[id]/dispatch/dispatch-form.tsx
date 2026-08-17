"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateDispatch, addDispatchComment, type DispatchFormState, type AddCommentState } from "./actions";
import { DateTime24Field, type DateTimeValue } from "@/components/DateTime24Field";

function toLocalParts(iso: string | null): DateTimeValue {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function isComplete(v: DateTimeValue): boolean {
  return Boolean(v.date && v.time);
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function DispatchForm({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: {
    dispatchTimeCallArrival: string | null;
    dispatchTimeCallAnswer: string | null;
    dispatchTimeCallCreate: string | null;
    timeIncidentClear: string | null;
    dispatchAutomaticAlarm: boolean | null;
    dispatchDeterminateCode: string | null;
    dispatchIncidentCode: string | null;
    dispatchFinalDisposition: string | null;
  };
}) {
  const initialState: DispatchFormState = {};
  const action = updateDispatch.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [arrival, setArrival] = useState<DateTimeValue>(() => toLocalParts(initial.dispatchTimeCallArrival));
  const [answered, setAnswered] = useState<DateTimeValue>(() => toLocalParts(initial.dispatchTimeCallAnswer));
  const [created, setCreated] = useState<DateTimeValue>(() => toLocalParts(initial.dispatchTimeCallCreate));
  const [cleared, setCleared] = useState<DateTimeValue>(() => toLocalParts(initial.timeIncidentClear));

  const [automaticAlarm, setAutomaticAlarm] = useState(
    initial.dispatchAutomaticAlarm === null ? "" : String(initial.dispatchAutomaticAlarm),
  );
  const [determinateCode, setDeterminateCode] = useState(initial.dispatchDeterminateCode ?? "");
  const [incidentCode, setIncidentCode] = useState(initial.dispatchIncidentCode ?? "");
  const [finalDisposition, setFinalDisposition] = useState(initial.dispatchFinalDisposition ?? "");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  const arrivalMax = isComplete(answered) ? answered : isComplete(created) ? created : undefined;
  const answeredMin = isComplete(arrival) ? arrival : undefined;
  const answeredMax = isComplete(created) ? created : undefined;
  const createdMin = isComplete(answered) ? answered : isComplete(arrival) ? arrival : undefined;

  return (
    <div className="space-y-8">
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
          <h2 className="font-semibold">Times</h2>
          <div className="flex flex-col gap-3">
            <DateTime24Field
              label="Call received at dispatch center"
              fieldName="dispatchTimeCallArrival"
              date={arrival.date}
              time={arrival.time}
              max={arrivalMax}
              onDateChange={(d) => {
                setArrival((v) => ({ ...v, date: d }));
                setAnswered((v) => (v.date ? v : { ...v, date: d }));
              }}
              onTimeChange={(t) => setArrival((v) => ({ ...v, time: t }))}
            />
            <DateTime24Field
              label="Call answered"
              fieldName="dispatchTimeCallAnswer"
              date={answered.date}
              time={answered.time}
              min={answeredMin}
              max={answeredMax}
              onDateChange={(d) => {
                setAnswered((v) => ({ ...v, date: d }));
                setCreated((v) => (v.date ? v : { ...v, date: d }));
              }}
              onTimeChange={(t) => setAnswered((v) => ({ ...v, time: t }))}
            />
            <DateTime24Field
              label="Call created"
              fieldName="dispatchTimeCallCreate"
              date={created.date}
              time={created.time}
              min={createdMin}
              onDateChange={(d) => {
                setCreated((v) => ({ ...v, date: d }));
                setCleared((v) => (v.date ? v : { ...v, date: d }));
              }}
              onTimeChange={(t) => setCreated((v) => ({ ...v, time: t }))}
            />
            <DateTime24Field
              label="Incident clear"
              fieldName="timeIncidentClear"
              date={cleared.date}
              time={cleared.time}
              onDateChange={(d) => setCleared((v) => ({ ...v, date: d }))}
              onTimeChange={(t) => setCleared((v) => ({ ...v, time: t }))}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Dispatch details</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Automatic alarm
              <select
                name="dispatchAutomaticAlarm"
                value={automaticAlarm}
                onChange={(e) => setAutomaticAlarm(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Determinate code
              <input
                name="dispatchDeterminateCode"
                maxLength={8}
                value={determinateCode}
                onChange={(e) => setDeterminateCode(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Incident code
              <input
                name="dispatchIncidentCode"
                maxLength={255}
                value={incidentCode}
                onChange={(e) => setIncidentCode(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Final disposition
              <input
                name="dispatchFinalDisposition"
                maxLength={255}
                value={finalDisposition}
                onChange={(e) => setFinalDisposition(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
          </div>
        </section>

        <SaveButton label="Save dispatch" />
      </form>

      <AddCommentForm incidentId={incidentId} />
    </div>
  );
}

function AddCommentForm({ incidentId }: { incidentId: string }) {
  const initialState: AddCommentState = {};
  const action = addDispatchComment.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);
  const [timestamp, setTimestamp] = useState<DateTimeValue>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  });

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  return (
    <form action={formAction} className="space-y-3 border-t border-slate-200 pt-6">
      <h2 className="font-semibold">Add comment</h2>
      {state.message && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">{state.message}</p>}
      {allErrors.length > 0 && (
        <ul className="list-disc rounded bg-red-50 p-3 pl-6 text-sm text-red-800">
          {allErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <DateTime24Field
        label="Comment time"
        fieldName="timestamp"
        date={timestamp.date}
        time={timestamp.time}
        onDateChange={(d) => setTimestamp((v) => ({ ...v, date: d }))}
        onTimeChange={(t) => setTimestamp((v) => ({ ...v, time: t }))}
        required
      />
      <label className="flex flex-col gap-1 text-sm">
        Comment
        <textarea name="comment" rows={2} required className="rounded border border-slate-300 px-2 py-1" />
      </label>
      <SaveButton label="Add comment" />
    </form>
  );
}
