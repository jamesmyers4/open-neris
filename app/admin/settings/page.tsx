import { redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'
import { DepartmentSettingsForm } from './department-settings-form'
import { StationsSection } from './stations-section'
import { NerisCredentialsForm } from './neris-credentials-form'

export default async function AdminSettingsPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')
  if (user.role !== 'ADMIN') redirect('/incidents')

  const department = await prisma.department.findUniqueOrThrow({
    where: { id: user.departmentId },
    include: {
      stations: {
        orderBy: { label: 'asc' },
        include: { units: { orderBy: { designation: 'asc' } } }
      }
    }
  })

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-8">
      <h1 className="text-2xl font-bold">Organization settings</h1>

      <DepartmentSettingsForm
        department={{
          name: department.name,
          address1: department.address1,
          address2: department.address2,
          city: department.city,
          state: department.state,
          zip: department.zip,
          mailingAddress1: department.mailingAddress1,
          mailingAddress2: department.mailingAddress2,
          mailingCity: department.mailingCity,
          mailingState: department.mailingState,
          mailingZip: department.mailingZip,
          fdType: department.fdType,
          staffActiveFfCareerFt: department.staffActiveFfCareerFt,
          staffActiveFfCareerPt: department.staffActiveFfCareerPt,
          staffActiveFfVolunteer: department.staffActiveFfVolunteer,
          staffActiveEmsOnlyCareerFt: department.staffActiveEmsOnlyCareerFt,
          staffActiveEmsOnlyCareerPt: department.staffActiveEmsOnlyCareerPt,
          staffActiveEmsOnlyVolunteer: department.staffActiveEmsOnlyVolunteer,
          staffActiveCiviliansCareerFt: department.staffActiveCiviliansCareerFt,
          staffActiveCiviliansCareerPt: department.staffActiveCiviliansCareerPt,
          staffActiveCiviliansVolunteer: department.staffActiveCiviliansVolunteer,
          internalIdMode: department.internalIdMode,
          internalIdTemplate: department.internalIdTemplate
        }}
      />

      <NerisCredentialsForm
        credentials={{
          nerisVendorClientId: department.nerisVendorClientId,
          nerisEnvironment: department.nerisEnvironment,
          hasSecret: department.nerisVendorSecretCipher !== null
        }}
      />

      <StationsSection
        stations={department.stations.map(station => ({
          id: station.id,
          label: station.label,
          address: station.address,
          nerisStationId: station.nerisStationId,
          units: station.units.map(unit => ({
            id: unit.id,
            designation: unit.designation,
            capabilityType: unit.capabilityType,
            nerisUnitId: unit.nerisUnitId
          }))
        }))}
      />
    </main>
  )
}
