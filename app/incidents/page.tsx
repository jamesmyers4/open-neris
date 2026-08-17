import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentAppUser } from '@/lib/auth/current-user'

const statusStyles: Record<string, string> = {
  OPEN: 'bg-slate-100 text-slate-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  REVIEWED: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-amber-100 text-amber-800',
  SENT: 'bg-teal-100 text-teal-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-100 text-red-800'
}

export default async function IncidentsPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')

  const incidents = await prisma.incident.findMany({
    where: { departmentId: user.departmentId },
    include: { types: { where: { isPrimary: true }, take: 1 } },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incidents</h1>
        <Link href="/incidents/new" className="rounded bg-slate-900 px-4 py-2 text-white">
          New incident
        </Link>
      </div>
      {incidents.length === 0 ? (
        <p className="text-slate-600">No incidents yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4">Internal ID</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Primary type</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map(incident => (
              <tr key={incident.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <Link href={`/incidents/${incident.id}`} className="text-slate-900 underline">
                    {incident.internalId}
                  </Link>
                </td>
                <td className="py-2 pr-4">{incident.incidentDate.toLocaleDateString()}</td>
                <td className="py-2 pr-4">{incident.types[0]?.value1 ?? '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${statusStyles[incident.reviewStatus]}`}>
                    {incident.reviewStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
