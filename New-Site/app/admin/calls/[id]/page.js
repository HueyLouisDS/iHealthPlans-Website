/**
 * One call, /admin/calls/[id]. Recording, transcript, and the matched lead.
 *
 * IMPORTANT this page will eventually serve call recordings, which contain
 * personal health information. Before a player is wired up, 2 things must
 * exist. Recordings must be served through short lived signed urls rather than
 * a guessable path, and every access must be written to an audit log naming
 * who listened and when. The placeholder below is deliberately inert.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import { DataSourceNotice, EmptyState, MatchPill } from '@/components/admin/AdminUi'
import { getCall, usingFixtures } from '@/lib/admin/data'

/**
 * One labelled fact in a side panel.
 */
function Fact({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-semibold uppercase tracking-[1.2px] text-[#6C7381]">{label}</dt>
      <dd className={`text-base break-words ${mono ? 'font-mono' : ''}`}>{value ?? '-'}</dd>
    </div>
  )
}

export default async function AdminCallDetailPage({ params }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const { id } = await params
  const call = await getCall(id)

  /*
   * An unknown id must 404 rather than render an empty shell, or the page
   * becomes a way to probe which ids exist
   */
  if (isFixtures && !call) notFound()

  return (
    <AdminShell user={session.user} currentPath="/admin/calls" title="Call" description={`Reference ${id}`}>
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="call records, a recording store with signed url access, and an access audit log before any recording is playable"
      />

      {!call ? (
        <EmptyState message="No call record found. Nothing is being captured yet." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="flex flex-col gap-6">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-ihealthBlue mb-4">Recording</h2>
              {call.hasRecording ? (
                <div className="border-2 border-dashed rounded-lg px-5 py-8 text-center">
                  <p className="text-lg text-[#505258]">Recording player not wired up.</p>
                  <p className="text-base text-[#6C7381] mt-2">
                    Recordings contain personal health information. This needs signed url access and
                    an audit log of who listened before it plays anything.
                  </p>
                </div>
              ) : (
                <p className="text-base text-[#505258]">No recording. The call was {call.disposition}.</p>
              )}
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-ihealthBlue mb-4">Transcript</h2>
              {call.transcript.length === 0 ? (
                <p className="text-base text-[#505258]">No transcript for this call.</p>
              ) : (
                <ol className="flex flex-col gap-4">
                  {call.transcript.map((line, index) => (
                    <li key={index} className="grid grid-cols-[52px_72px_1fr] gap-3 items-baseline">
                      <span className="text-sm text-[#6C7381] tabular-nums">{line.at}</span>
                      <span className="text-sm font-semibold text-ihealthBlue">{line.speaker}</span>
                      <span className="text-base">{line.text}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-ihealthBlue mb-4">Call</h2>
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Started" value={call.startedAtLabel} />
                <Fact label="Duration" value={call.durationLabel} />
                <Fact label="From" value={call.fromNumber} />
                <Fact label="Agent" value={call.agent} />
                <Fact label="Outcome" value={call.disposition} />
                <Fact label="Session" value={<MatchPill matched={call.matched} />} />
              </dl>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-ihealthBlue mb-4">Matched lead</h2>
              {call.lead ? (
                <>
                  <Link
                    href={`/admin/leads/${call.lead.id}`}
                    className="text-[#105fa8] font-semibold hover:underline text-lg"
                  >
                    {call.lead.name}
                  </Link>
                  <dl className="grid grid-cols-2 gap-4 mt-4">
                    <Fact label="Source" value={call.lead.source} />
                    <Fact label="Campaign" value={call.lead.campaign} />
                    <Fact label="Session id" value={call.sessionId} mono />
                    <Fact label="Visitor id" value={call.visitorId} mono />
                  </dl>
                </>
              ) : (
                <p className="text-base text-[#505258]">
                  This call could not be matched to a web session, so there is no attribution for it.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
