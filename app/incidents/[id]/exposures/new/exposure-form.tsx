'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createExposure, type CreateExposureState } from '../actions'
import { TypeDisplaceCause, TypeExposureDamage, TypeExposureItem, TypeExposureLoc } from '@/lib/neris/generated/enums'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {pending ? 'Saving…' : 'Add exposure'}
    </button>
  )
}

export function ExposureForm({ incidentId }: { incidentId: string }) {
  const initialState: CreateExposureState = {}
  const action = createExposure.bind(null, incidentId)
  const [state, formAction] = useActionState(action, initialState)

  const allErrors = state.errors ? Object.values(state.errors).flat().filter((e): e is string => Boolean(e)) : []

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
            Exposure type
            <select name="exposureType" required defaultValue="" className="rounded border border-slate-300 px-2 py-1">
              <option value="">—</option>
              {TypeExposureLoc.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Exposure item
            <select name="exposureItem" required defaultValue="" className="rounded border border-slate-300 px-2 py-1">
              <option value="">—</option>
              {TypeExposureItem.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Damage
            <select name="exposureDamage" defaultValue="" className="rounded border border-slate-300 px-2 py-1">
              <option value="">—</option>
              {TypeExposureDamage.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            People present
            <select name="exposurePeoplePresent" defaultValue="" className="rounded border border-slate-300 px-2 py-1">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Number displaced
            <input type="number" min={0} name="exposureDisplacedNumber" className="rounded border border-slate-300 px-2 py-1" />
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="text-sm font-medium">Displacement causes</legend>
          {TypeDisplaceCause.map(cause => (
            <label key={cause} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="exposureDisplacedCauses" value={cause} />
              {cause}
            </label>
          ))}
        </fieldset>
      </section>

      <SubmitButton />
    </form>
  )
}
