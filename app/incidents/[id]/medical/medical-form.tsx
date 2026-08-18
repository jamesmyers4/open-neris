"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createMedical, type CreateMedicalState } from "./actions";
import { TypeMedicalPatientCare, TypeMedicalPatientStatus, TypeMedicalTransport } from "@/lib/neris/generated/enums";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Add patient"}
    </button>
  );
}

export function MedicalForm({ incidentId }: { incidentId: string }) {
  const initialState: CreateMedicalState = {};
  const action = createMedical.bind(null, incidentId);
  const [state, formAction] = useActionState(action, initialState);

  const [careReport, setCareReport] = useState("");
  const [evaluationCare, setEvaluationCare] = useState("");
  const [improvedStatus, setImprovedStatus] = useState("");
  const [disposition, setDisposition] = useState("");

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

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Patient care report #
            <input
              name="patientCareReport"
              maxLength={255}
              value={careReport}
              onChange={(e) => setCareReport(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Evaluation / care provided
            <select
              name="patientEvaluationCare"
              required
              value={evaluationCare}
              onChange={(e) => setEvaluationCare(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeMedicalPatientCare.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Patient status after care
            <select
              name="patientImprovedStatus"
              value={improvedStatus}
              onChange={(e) => setImprovedStatus(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeMedicalPatientStatus.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Transport disposition
            <select
              name="medicalDisposition"
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeMedicalTransport.map((v) => (
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
