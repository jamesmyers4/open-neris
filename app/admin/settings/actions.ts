'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { departmentSettingsSchema } from '@/lib/validation/department-settings.schema'
import { stationSchema } from '@/lib/validation/station.schema'
import { unitSchema } from '@/lib/validation/unit.schema'

type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentAppUser>>>

async function requireAdmin(): Promise<{ user: AdminUser } | { error: string }> {
  const user = await getCurrentAppUser()
  if (!user) return { error: 'You must be signed in.' }
  if (user.role !== 'ADMIN') return { error: 'Admins only.' }
  return { user }
}

function isForeignKeyRestriction(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'
}

export type DepartmentSettingsState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

export async function updateDepartment(_prevState: DepartmentSettingsState, formData: FormData): Promise<DepartmentSettingsState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const raw = {
    name: formData.get('name') || undefined,
    address1: formData.get('address1') || undefined,
    address2: formData.get('address2') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    zip: formData.get('zip') || undefined,
    mailingAddress1: formData.get('mailingAddress1') || undefined,
    mailingAddress2: formData.get('mailingAddress2') || undefined,
    mailingCity: formData.get('mailingCity') || undefined,
    mailingState: formData.get('mailingState') || undefined,
    mailingZip: formData.get('mailingZip') || undefined,
    fdType: formData.get('fdType') || undefined,
    staffActiveFfCareerFt: formData.get('staffActiveFfCareerFt') || undefined,
    staffActiveFfCareerPt: formData.get('staffActiveFfCareerPt') || undefined,
    staffActiveFfVolunteer: formData.get('staffActiveFfVolunteer') || undefined,
    staffActiveEmsOnlyCareerFt: formData.get('staffActiveEmsOnlyCareerFt') || undefined,
    staffActiveEmsOnlyCareerPt: formData.get('staffActiveEmsOnlyCareerPt') || undefined,
    staffActiveEmsOnlyVolunteer: formData.get('staffActiveEmsOnlyVolunteer') || undefined,
    staffActiveCiviliansCareerFt: formData.get('staffActiveCiviliansCareerFt') || undefined,
    staffActiveCiviliansCareerPt: formData.get('staffActiveCiviliansCareerPt') || undefined,
    staffActiveCiviliansVolunteer: formData.get('staffActiveCiviliansVolunteer') || undefined,
    internalIdMode: formData.get('internalIdMode') || undefined,
    internalIdTemplate: formData.get('internalIdTemplate') || undefined
  }

  const parsed = departmentSettingsSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.department.update({
    where: { id: admin.user.departmentId },
    data: {
      name: parsed.data.name,
      address1: parsed.data.address1 ?? null,
      address2: parsed.data.address2 ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      zip: parsed.data.zip ?? null,
      mailingAddress1: parsed.data.mailingAddress1 ?? null,
      mailingAddress2: parsed.data.mailingAddress2 ?? null,
      mailingCity: parsed.data.mailingCity ?? null,
      mailingState: parsed.data.mailingState ?? null,
      mailingZip: parsed.data.mailingZip ?? null,
      fdType: parsed.data.fdType ?? null,
      staffActiveFfCareerFt: parsed.data.staffActiveFfCareerFt ?? null,
      staffActiveFfCareerPt: parsed.data.staffActiveFfCareerPt ?? null,
      staffActiveFfVolunteer: parsed.data.staffActiveFfVolunteer ?? null,
      staffActiveEmsOnlyCareerFt: parsed.data.staffActiveEmsOnlyCareerFt ?? null,
      staffActiveEmsOnlyCareerPt: parsed.data.staffActiveEmsOnlyCareerPt ?? null,
      staffActiveEmsOnlyVolunteer: parsed.data.staffActiveEmsOnlyVolunteer ?? null,
      staffActiveCiviliansCareerFt: parsed.data.staffActiveCiviliansCareerFt ?? null,
      staffActiveCiviliansCareerPt: parsed.data.staffActiveCiviliansCareerPt ?? null,
      staffActiveCiviliansVolunteer: parsed.data.staffActiveCiviliansVolunteer ?? null,
      internalIdMode: parsed.data.internalIdMode,
      internalIdTemplate: parsed.data.internalIdTemplate ?? null
    }
  })

  revalidatePath('/admin/settings')
  return { message: 'Saved.' }
}

export type StationState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

function parseStationForm(formData: FormData) {
  return stationSchema.safeParse({
    label: formData.get('label') || undefined,
    address: formData.get('address') || undefined,
    nerisStationId: formData.get('nerisStationId') || undefined
  })
}

export async function createStation(_prevState: StationState, formData: FormData): Promise<StationState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const parsed = parseStationForm(formData)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.station.create({
    data: { departmentId: admin.user.departmentId, ...parsed.data }
  })

  revalidatePath('/admin/settings')
  return { message: 'Station added.' }
}

export async function updateStation(stationId: string, _prevState: StationState, formData: FormData): Promise<StationState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const station = await prisma.station.findFirst({ where: { id: stationId, departmentId: admin.user.departmentId } })
  if (!station) return { message: 'Station not found.' }

  const parsed = parseStationForm(formData)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.station.update({ where: { id: stationId }, data: parsed.data })

  revalidatePath('/admin/settings')
  return { message: 'Saved.' }
}

export async function deleteStation(_prevState: StationState, formData: FormData): Promise<StationState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const stationId = formData.get('stationId')
  if (typeof stationId !== 'string') return { message: 'Station not found.' }

  const station = await prisma.station.findFirst({ where: { id: stationId, departmentId: admin.user.departmentId } })
  if (!station) return { message: 'Station not found.' }

  try {
    await prisma.station.delete({ where: { id: stationId } })
  } catch (error) {
    if (isForeignKeyRestriction(error)) {
      return { message: 'Cannot delete this station — one of its units is referenced by a historical incident.' }
    }
    throw error
  }

  revalidatePath('/admin/settings')
  return { message: 'Station removed.' }
}

export type UnitState = {
  errors?: Record<string, string[] | undefined>
  message?: string
}

function parseUnitForm(formData: FormData) {
  return unitSchema.safeParse({
    designation: formData.get('designation') || undefined,
    capabilityType: formData.get('capabilityType') || undefined,
    nerisUnitId: formData.get('nerisUnitId') || undefined
  })
}

export async function createUnit(stationId: string, _prevState: UnitState, formData: FormData): Promise<UnitState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const station = await prisma.station.findFirst({ where: { id: stationId, departmentId: admin.user.departmentId } })
  if (!station) return { message: 'Station not found.' }

  const parsed = parseUnitForm(formData)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.unit.create({ data: { stationId, ...parsed.data } })

  revalidatePath('/admin/settings')
  return { message: 'Unit added.' }
}

export async function updateUnit(unitId: string, _prevState: UnitState, formData: FormData): Promise<UnitState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const unit = await prisma.unit.findFirst({ where: { id: unitId, station: { departmentId: admin.user.departmentId } } })
  if (!unit) return { message: 'Unit not found.' }

  const parsed = parseUnitForm(formData)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: 'Fix the errors below and try again.' }
  }

  await prisma.unit.update({ where: { id: unitId }, data: parsed.data })

  revalidatePath('/admin/settings')
  return { message: 'Saved.' }
}

export async function deleteUnit(_prevState: UnitState, formData: FormData): Promise<UnitState> {
  const admin = await requireAdmin()
  if ('error' in admin) return { message: admin.error }

  const unitId = formData.get('unitId')
  if (typeof unitId !== 'string') return { message: 'Unit not found.' }

  const unit = await prisma.unit.findFirst({ where: { id: unitId, station: { departmentId: admin.user.departmentId } } })
  if (!unit) return { message: 'Unit not found.' }

  try {
    await prisma.unit.delete({ where: { id: unitId } })
  } catch (error) {
    if (isForeignKeyRestriction(error)) {
      return { message: 'Cannot delete this unit — it is referenced by a historical incident.' }
    }
    throw error
  }

  revalidatePath('/admin/settings')
  return { message: 'Unit removed.' }
}
