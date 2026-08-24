import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/prisma'
import { canReview, canApprove } from '@/lib/incidents/review-permissions'
import { getReviewQueue } from '@/lib/incidents/get-review-queue'
import { markReviewed, approveIncident } from '@/app/incidents/[id]/actions'
import { KickbackForm } from '@/app/incidents/[id]/kickback-form'

const statusStyles: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-800',
  REVIEWED: 'bg-purple-100 text-purple-800'
}

export default async function ReviewQueuePage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/sign-in')
  if (!canReview(user.role)) redirect('/incidents')

  const incidents = await getReviewQueue(prisma, user.departmentId)

  const userCanApprove = canApprove(user.role)

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Review queue</h1>
      {incidents.length === 0 ? (
        <p className="text-slate-600">Nothing waiting on review or approval.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4">Internal ID</th>
              <th className="py-2 pr-4">Primary type</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
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
                <td className="py-2 pr-4">{incident.types[0]?.value1 ?? '—'}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${statusStyles[incident.reviewStatus]}`}>
                    {incident.reviewStatus}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex flex-col items-start gap-2">
                    {incident.reviewStatus === 'SUBMITTED' && (
                      <form action={markReviewed.bind(null, incident.id)}>
                        <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white">
                          Mark Reviewed
                        </button>
                      </form>
                    )}
                    {incident.reviewStatus === 'REVIEWED' && (
                      <>
                        {userCanApprove && (
                          <form action={approveIncident.bind(null, incident.id)}>
                            <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white">
                              Approve
                            </button>
                          </form>
                        )}
                        <KickbackForm incidentId={incident.id} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
