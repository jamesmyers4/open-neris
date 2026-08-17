import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { locationUseOptions, locPlaceOptions } from '@/lib/neris/lookups'
import { LocationForm } from './location-form'

export default async function LocationTabPage(props: PageProps<'/incidents/[id]/location'>) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await props.params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  return (
    <LocationForm
      incidentId={incident.id}
      locationUseOptions={locationUseOptions}
      locPlaceOptions={locPlaceOptions}
      initial={{
        streetAddressComplete: incident.location?.streetAddressComplete ?? '',
        city: incident.location?.city ?? '',
        county: incident.location?.county ?? '',
        state: incident.location?.state ?? '',
        postalCode: incident.location?.postalCode ?? '',
        country: incident.location?.country ?? 'US',
        place: incident.location?.place ?? '',
        useType: incident.location?.useType ?? '',
        useSubtype: incident.location?.useSubtype ?? '',
        useVacancy: incident.location?.useVacancy ?? ''
      }}
    />
  )
}
