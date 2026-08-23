"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createStation,
  updateStation,
  deleteStation,
  createUnit,
  updateUnit,
  deleteUnit,
  type StationState,
  type UnitState,
} from "./actions";
import { unitCapabilityOptions } from "@/lib/neris/lookups";

type UnitData = { id: string; designation: string; capabilityType: string | null; nerisUnitId: string | null };
type StationData = { id: string; label: string; address: string | null; nerisStationId: string | null; units: UnitData[] };

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50">
      {pending ? "Saving…" : label}
    </button>
  );
}

function DeleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-red-700 underline disabled:opacity-50">
      {pending ? "Removing…" : label}
    </button>
  );
}

function UnitRow({ unit }: { unit: UnitData }) {
  const [editing, setEditing] = useState(false);
  const updateInitial: UnitState = {};
  const updateAction = updateUnit.bind(null, unit.id);
  const [updateState, updateFormAction] = useActionState(updateAction, updateInitial);
  const deleteInitial: UnitState = {};
  const [deleteState, deleteFormAction] = useActionState(deleteUnit, deleteInitial);
  const [designation, setDesignation] = useState(unit.designation);
  const [capabilityType, setCapabilityType] = useState(unit.capabilityType ?? "");
  const [nerisUnitId, setNerisUnitId] = useState(unit.nerisUnitId ?? "");

  if (!editing) {
    return (
      <li className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span>{[unit.designation, unit.capabilityType, unit.nerisUnitId].filter(Boolean).join(" / ")}</span>
          <span className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-slate-600 underline">
              Edit
            </button>
            <form action={deleteFormAction}>
              <input type="hidden" name="unitId" value={unit.id} />
              <DeleteButton label="Delete" />
            </form>
          </span>
        </div>
        {deleteState.message && <p className="text-xs text-red-700">{deleteState.message}</p>}
      </li>
    );
  }

  return (
    <li className="rounded border border-slate-300 bg-slate-50 p-3">
      <form action={updateFormAction} className="space-y-2">
        {updateState.message && <p className="text-xs text-amber-900">{updateState.message}</p>}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            Designation
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
          <label className="flex flex-col gap-1 text-xs">
            NERIS unit ID
            <input
              name="nerisUnitId"
              value={nerisUnitId}
              onChange={(e) => setNerisUnitId(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <SaveButton label="Save" />
          <button type="button" onClick={() => setEditing(false)} className="rounded px-3 py-1 text-sm text-slate-600 underline">
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}

function AddUnitForm({ stationId }: { stationId: string }) {
  const initialState: UnitState = {};
  const action = createUnit.bind(null, stationId);
  const [state, formAction] = useActionState(action, initialState);
  const [designation, setDesignation] = useState("");
  const [capabilityType, setCapabilityType] = useState("");
  const [nerisUnitId, setNerisUnitId] = useState("");
  const errors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  return (
    <form action={formAction} className="space-y-2 rounded border border-dashed border-slate-300 p-3">
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
          Designation
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
        <label className="flex flex-col gap-1 text-xs">
          NERIS unit ID
          <input
            name="nerisUnitId"
            value={nerisUnitId}
            onChange={(e) => setNerisUnitId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </div>
      <SaveButton label="Add unit" />
    </form>
  );
}

function StationCard({ station }: { station: StationData }) {
  const [editing, setEditing] = useState(false);
  const updateInitial: StationState = {};
  const updateAction = updateStation.bind(null, station.id);
  const [updateState, updateFormAction] = useActionState(updateAction, updateInitial);
  const deleteInitial: StationState = {};
  const [deleteState, deleteFormAction] = useActionState(deleteStation, deleteInitial);
  const [label, setLabel] = useState(station.label);
  const [address, setAddress] = useState(station.address ?? "");
  const [nerisStationId, setNerisStationId] = useState(station.nerisStationId ?? "");

  return (
    <div className="space-y-3 rounded border border-slate-200 p-4">
      {!editing ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{station.label}</p>
            <p className="text-xs text-slate-600">{[station.address, station.nerisStationId].filter(Boolean).join(" / ")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-slate-600 underline">
              Edit
            </button>
            <form action={deleteFormAction}>
              <input type="hidden" name="stationId" value={station.id} />
              <DeleteButton label="Delete station" />
            </form>
          </div>
        </div>
      ) : (
        <form action={updateFormAction} className="space-y-2">
          {updateState.message && <p className="text-xs text-amber-900">{updateState.message}</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs">
              Label
              <input
                name="label"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Address
              <input
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              NERIS station ID
              <input
                name="nerisStationId"
                value={nerisStationId}
                onChange={(e) => setNerisStationId(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <SaveButton label="Save" />
            <button type="button" onClick={() => setEditing(false)} className="rounded px-3 py-1 text-sm text-slate-600 underline">
              Cancel
            </button>
          </div>
        </form>
      )}
      {deleteState.message && <p className="text-xs text-red-700">{deleteState.message}</p>}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <h4 className="text-xs font-medium text-slate-600">Units</h4>
        {station.units.length === 0 ? (
          <p className="text-xs text-slate-500">—</p>
        ) : (
          <ul className="space-y-2">
            {station.units.map((unit) => (
              <UnitRow key={unit.id} unit={unit} />
            ))}
          </ul>
        )}
        <AddUnitForm stationId={station.id} />
      </div>
    </div>
  );
}

function AddStationForm() {
  const initialState: StationState = {};
  const [state, formAction] = useActionState(createStation, initialState);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [nerisStationId, setNerisStationId] = useState("");
  const errors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : [];

  return (
    <form action={formAction} className="space-y-2 rounded border border-dashed border-slate-300 p-4">
      <h3 className="text-sm font-medium">Add station</h3>
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
          Label
          <input
            name="label"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Address
          <input
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          NERIS station ID
          <input
            name="nerisStationId"
            value={nerisStationId}
            onChange={(e) => setNerisStationId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </div>
      <SaveButton label="Add station" />
    </form>
  );
}

export function StationsSection({ stations }: { stations: StationData[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Stations &amp; units</h2>
      {stations.length === 0 ? (
        <p className="text-sm text-slate-500">No stations yet.</p>
      ) : (
        <div className="space-y-4">
          {stations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}
      <AddStationForm />
    </section>
  );
}
