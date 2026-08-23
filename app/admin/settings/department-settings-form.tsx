"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateDepartment, type DepartmentSettingsState } from "./actions";
import { TypeDept } from "@/lib/neris/generated/enums";
import { internalIdModes } from "@/lib/validation/department-settings.schema";

type DepartmentFields = {
  name: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  mailingAddress1: string | null;
  mailingAddress2: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  mailingZip: string | null;
  fdType: string | null;
  staffActiveFfCareerFt: number | null;
  staffActiveFfCareerPt: number | null;
  staffActiveFfVolunteer: number | null;
  staffActiveEmsOnlyCareerFt: number | null;
  staffActiveEmsOnlyCareerPt: number | null;
  staffActiveEmsOnlyVolunteer: number | null;
  staffActiveCiviliansCareerFt: number | null;
  staffActiveCiviliansCareerPt: number | null;
  staffActiveCiviliansVolunteer: number | null;
  internalIdMode: string;
  internalIdTemplate: string | null;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving…" : "Save department settings"}
    </button>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1"
      />
    </label>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type="number"
        min={0}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1"
      />
    </label>
  );
}

export function DepartmentSettingsForm({ department }: { department: DepartmentFields }) {
  const initialState: DepartmentSettingsState = {};
  const [state, formAction] = useActionState(updateDepartment, initialState);

  const [name, setName] = useState(department.name);
  const [address1, setAddress1] = useState(department.address1 ?? "");
  const [address2, setAddress2] = useState(department.address2 ?? "");
  const [city, setCity] = useState(department.city ?? "");
  const [addrState, setAddrState] = useState(department.state ?? "");
  const [zip, setZip] = useState(department.zip ?? "");
  const [mailingAddress1, setMailingAddress1] = useState(department.mailingAddress1 ?? "");
  const [mailingAddress2, setMailingAddress2] = useState(department.mailingAddress2 ?? "");
  const [mailingCity, setMailingCity] = useState(department.mailingCity ?? "");
  const [mailingState, setMailingState] = useState(department.mailingState ?? "");
  const [mailingZip, setMailingZip] = useState(department.mailingZip ?? "");
  const [fdType, setFdType] = useState(department.fdType ?? "");
  const [staffActiveFfCareerFt, setStaffActiveFfCareerFt] = useState(department.staffActiveFfCareerFt?.toString() ?? "");
  const [staffActiveFfCareerPt, setStaffActiveFfCareerPt] = useState(department.staffActiveFfCareerPt?.toString() ?? "");
  const [staffActiveFfVolunteer, setStaffActiveFfVolunteer] = useState(department.staffActiveFfVolunteer?.toString() ?? "");
  const [staffActiveEmsOnlyCareerFt, setStaffActiveEmsOnlyCareerFt] = useState(department.staffActiveEmsOnlyCareerFt?.toString() ?? "");
  const [staffActiveEmsOnlyCareerPt, setStaffActiveEmsOnlyCareerPt] = useState(department.staffActiveEmsOnlyCareerPt?.toString() ?? "");
  const [staffActiveEmsOnlyVolunteer, setStaffActiveEmsOnlyVolunteer] = useState(department.staffActiveEmsOnlyVolunteer?.toString() ?? "");
  const [staffActiveCiviliansCareerFt, setStaffActiveCiviliansCareerFt] = useState(department.staffActiveCiviliansCareerFt?.toString() ?? "");
  const [staffActiveCiviliansCareerPt, setStaffActiveCiviliansCareerPt] = useState(department.staffActiveCiviliansCareerPt?.toString() ?? "");
  const [staffActiveCiviliansVolunteer, setStaffActiveCiviliansVolunteer] = useState(department.staffActiveCiviliansVolunteer?.toString() ?? "");
  const [internalIdMode, setInternalIdMode] = useState(department.internalIdMode);
  const [internalIdTemplate, setInternalIdTemplate] = useState(department.internalIdTemplate ?? "");

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  return (
    <form action={formAction} className="space-y-6">
      <h2 className="text-lg font-semibold">Department</h2>
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
          <TextField label="Department name" name="name" value={name} onChange={setName} />
          <label className="flex flex-col gap-1 text-sm">
            Staffing type
            <select
              name="fdType"
              value={fdType}
              onChange={(e) => setFdType(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="">—</option>
              {TypeDept.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Physical address</h3>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Address line 1" name="address1" value={address1} onChange={setAddress1} />
          <TextField label="Address line 2" name="address2" value={address2} onChange={setAddress2} />
          <TextField label="City" name="city" value={city} onChange={setCity} />
          <TextField label="State" name="state" value={addrState} onChange={setAddrState} />
          <TextField label="Zip" name="zip" value={zip} onChange={setZip} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Mailing address</h3>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Address line 1" name="mailingAddress1" value={mailingAddress1} onChange={setMailingAddress1} />
          <TextField label="Address line 2" name="mailingAddress2" value={mailingAddress2} onChange={setMailingAddress2} />
          <TextField label="City" name="mailingCity" value={mailingCity} onChange={setMailingCity} />
          <TextField label="State" name="mailingState" value={mailingState} onChange={setMailingState} />
          <TextField label="Zip" name="mailingZip" value={mailingZip} onChange={setMailingZip} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Staffing counts</h3>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="FF career full-time" name="staffActiveFfCareerFt" value={staffActiveFfCareerFt} onChange={setStaffActiveFfCareerFt} />
          <NumberField label="FF career part-time" name="staffActiveFfCareerPt" value={staffActiveFfCareerPt} onChange={setStaffActiveFfCareerPt} />
          <NumberField label="FF volunteer" name="staffActiveFfVolunteer" value={staffActiveFfVolunteer} onChange={setStaffActiveFfVolunteer} />
          <NumberField label="EMS-only career full-time" name="staffActiveEmsOnlyCareerFt" value={staffActiveEmsOnlyCareerFt} onChange={setStaffActiveEmsOnlyCareerFt} />
          <NumberField label="EMS-only career part-time" name="staffActiveEmsOnlyCareerPt" value={staffActiveEmsOnlyCareerPt} onChange={setStaffActiveEmsOnlyCareerPt} />
          <NumberField label="EMS-only volunteer" name="staffActiveEmsOnlyVolunteer" value={staffActiveEmsOnlyVolunteer} onChange={setStaffActiveEmsOnlyVolunteer} />
          <NumberField label="Civilian career full-time" name="staffActiveCiviliansCareerFt" value={staffActiveCiviliansCareerFt} onChange={setStaffActiveCiviliansCareerFt} />
          <NumberField label="Civilian career part-time" name="staffActiveCiviliansCareerPt" value={staffActiveCiviliansCareerPt} onChange={setStaffActiveCiviliansCareerPt} />
          <NumberField label="Civilian volunteer" name="staffActiveCiviliansVolunteer" value={staffActiveCiviliansVolunteer} onChange={setStaffActiveCiviliansVolunteer} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Internal incident ID</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Mode
            <select
              name="internalIdMode"
              value={internalIdMode}
              onChange={(e) => setInternalIdMode(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              {internalIdModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          {internalIdMode === "CUSTOM_TEMPLATE" && (
            <TextField label="Template (e.g. {year}-{seq:6})" name="internalIdTemplate" value={internalIdTemplate} onChange={setInternalIdTemplate} />
          )}
        </div>
      </section>

      <SaveButton />
    </form>
  );
}
