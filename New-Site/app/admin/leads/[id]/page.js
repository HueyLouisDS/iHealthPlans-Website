/**
 * One lead and their complete journey, /admin/leads/[id].
 *
 * This is the page that proves the engagement works. It resolves the ad click,
 * the landing page, the pages read, the phone click, the call, the recording,
 * and the CRM record to a single person. If it renders correctly the identity
 * problem is solved, and if it cannot, none of the aggregate reporting
 * elsewhere in this area is trustworthy either.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import { DataSourceNotice, EmptyState, StatusPill, MatchPill } from '@/components/admin/AdminUi'
import { getLead, usingFixtures } from '@/lib/admin/data'

// Each timeline entry gets a dot colour by kind, so the shape of a journey is
// readable at a glance before any of the text is read
const EVENT_STYLES = {
  session: { dot: 'bg-[#878F99]', label: 'Session' },
  pageview: { dot: 'bg-[#C4C9D0]', label: 'Page view' },
  callclick: { dot: 'bg-ihealthGreen', label: 'Call click' },
  call: { dot: 'bg-ihealthBlue', label: 'Call' },
  lead: { dot: 'bg-amber-500', label: 'Lead' },
}

/**
 * One labelled fact in the identity panel.
 */
function Fact({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-semibold uppercase tracking-[1.2px] text-[#6C7381]">{label}</dt>
      <dd className={`text-base break-words ${mono ? 'font-mono' : ''}`}>{value ?? '-'}</dd>
    </div>
  )
}

export default async function AdminLeadDetailPage({ params }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const { id } = await params
  const lead = await getLead(id)

  // An unknown id must 404 rather than render an empty shell, or the page
  // becomes a way to probe which ids exist. Only applies once there is real
  // data to be probed, hence the guard on fixtures mode.
  if (isFixtures && !lead) notFound()

  return (
    <AdminShell user={session.user} currentPath="/admin/leads" title={lead?.name || 'Lead'} description={`Reference ${id}`}>
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="the full identity chain, visitor to session to call click to call to lead, joined on the ids minted at click time"
      />

      {!lead ? (
        <EmptyState message="No lead record found. Nothing is being captured yet." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-bold text-ihealthBlue mb-1">Journey</h2>
            <p className="text-base text-[#505258] mb-6">
              Everything below resolves to one person through the ids on the right.
            </p>

            <ol className="relative">
              {lead.timeline.map((event, index) => {
                const style = EVENT_STYLES[event.kind] || EVENT_STYLES.pageview
                const isLast = index === lead.timeline.length - 1

                return (
                  <li key={`${event.at}-${event.title}`} className="relative pl-8 pb-6 last:pb-0">
                    {/* The connecting line, stopped short on the final entry */}
                    {!isLast && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-gray-200" aria-hidden="true" />}
                    <span className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${style.dot}`} aria-hidden="true" />

                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <p className="font-semibold text-ihealthBlue">
                        {event.href ? (
                          <Link href={event.href} className="text-[#105fa8] hover:underline">
                            {event.title}
                          </Link>
                        ) : (
                          event.title
                        )}
                      </p>
                      <span className="text-sm text-[#6C7381]">{style.label}</span>
                      <span className="text-sm text-[#6C7381] ml-auto tabular-nums">{event.atLabel}</span>
                    </div>
                    <p className="text-base text-[#505258] mt-0.5">{event.detail}</p>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-ihealthBlue mb-4">Identity</h2>
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Name" value={lead.name} />
                <Fact label="Status" value={<StatusPill status={lead.status} />} />
                <Fact label="Phone" value={lead.phone} />
                <Fact label="Zip" value={lead.zip} />
                <Fact label="Email" value={lead.email} />
                <Fact label="Enquiring for" value={lead.onBehalfOf} />
                <Fact label="Visitor id" value={lead.visitorId} mono />
                <Fact label="Session id" value={lead.sessionId} mono />
                <Fact label="CRM record" value={lead.crmId || 'Not linked'} mono />
                <Fact label="Received" value={lead.createdAtLabel} />
              </dl>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-ihealthBlue mb-4">Attribution</h2>
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Source" value={lead.source} />
                <Fact label="Campaign" value={lead.campaign} />
                <Fact label="Landing page" value={lead.landingPage} mono />
                <Fact label="Device" value={lead.device} />
              </dl>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-ihealthBlue mb-4">Calls</h2>
              {lead.calls.length === 0 ? (
                <p className="text-base text-[#505258]">No calls. This lead arrived by form only.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {lead.calls.map((call) => (
                    <li key={call.id} className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-3 last:pb-0">
                      <div>
                        <Link href={`/admin/calls/${call.id}`} className="text-[#105fa8] font-semibold hover:underline">
                          {call.startedAtLabel}
                        </Link>
                        <p className="text-sm text-[#505258]">
                          {call.durationLabel} with {call.agent}, {call.disposition}
                        </p>
                      </div>
                      <MatchPill matched={call.matched} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
