import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { getIncidentDetail } from '@/lib/incidents/get-incident-detail'
import { getRelevantModules, type ModuleKey } from '@/lib/neris/module-relevance'

const incidentCoreTabs: { href: string; label: string }[] = [
  { href: '', label: 'Overview' },
  { href: 'dispatch', label: 'Dispatch' },
  { href: 'location', label: 'Location' },
  { href: 'people-displacement', label: 'People & Displacement' },
  { href: 'mutual-aid', label: 'Mutual Aid' },
  { href: 'narrative', label: 'Narrative' },
  { href: 'actions-taken', label: 'Actions Taken' }
]

const sectionLinks: { label: string; moduleKeys: ModuleKey[]; href?: string }[] = [
  { label: 'Exposures', moduleKeys: ['exposures'], href: 'exposures' },
  { label: 'Fire', moduleKeys: ['fire'], href: 'fire' },
  { label: 'Medical', moduleKeys: ['medical'], href: 'medical' },
  { label: 'HazSit', moduleKeys: ['hazsit'] },
  { label: 'Rescues', moduleKeys: ['rescuesFf', 'rescuesNonFf'] },
  { label: 'Responding Units', moduleKeys: ['unitResponse'] }
]

export default async function IncidentLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const { id } = await params
  const incident = await getIncidentDetail(id, user.departmentId)
  if (!incident) notFound()

  const relevantModules = getRelevantModules(incident.types)

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/incidents" className="text-sm text-slate-600 underline">
        ← Back to incidents
      </Link>
      <div className="mt-4 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{incident.internalId}</h1>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">{incident.reviewStatus}</span>
      </div>

      <nav className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {incidentCoreTabs.map(tab => (
          <Link
            key={tab.href}
            href={`/incidents/${id}${tab.href ? `/${tab.href}` : ''}`}
            className="rounded-t px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        {sectionLinks.map(section => {
          const relevant = section.moduleKeys.some(k => relevantModules.includes(k))
          if (!relevant) {
            return (
              <span key={section.label} className="rounded bg-slate-50 px-2 py-1 text-slate-400">
                {section.label}
              </span>
            )
          }
          if (!section.href) {
            return (
              <span key={section.label} className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                {section.label} (not built yet)
              </span>
            )
          }
          return (
            <Link
              key={section.label}
              href={`/incidents/${id}/${section.href}`}
              className="rounded bg-emerald-50 px-2 py-1 text-emerald-800 underline"
            >
              {section.label}
            </Link>
          )
        })}
      </nav>

      {children}
    </main>
  )
}
