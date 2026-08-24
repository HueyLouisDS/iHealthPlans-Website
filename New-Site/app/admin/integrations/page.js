/**
 * Integration status, /admin/integrations.
 *
 * Answers one question, is the dialer connected, without ever showing the
 * credential that connects it. Everything on this page comes through
 * describe(), which reports whether a key is present and never what it is.
 *
 * Server component, deliberately. lib/integrations/config.js carries
 * `import 'server-only'`, so the build fails if anything reachable from a
 * client component imports it. Making this page interactive would mean routing
 * the config through a client boundary, and the correct response to wanting
 * that is to pass the described shape down rather than the config.
 */

import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import { dialerConfig, crmConfig, describe } from '@/lib/integrations/config'

export const dynamic = 'force-dynamic'

/**
 * One integration, with what is set and what is missing.
 */
function IntegrationCard({ status, envPrefix }) {
  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-ihealthBlue">{status.label}</h2>

        <span
          className={`px-3 py-1 rounded text-sm font-bold uppercase tracking-[1.2px] ${
            status.isConfigured ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {status.isConfigured ? 'Connected' : 'Not configured'}
        </span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-6 gap-y-2 text-base">
        <dt className="font-semibold text-[#505258]">Base url</dt>
        <dd className="break-all">
          {status.baseUrl || <span className="text-[#6C7381]">not set</span>}
        </dd>

        <dt className="font-semibold text-[#505258]">API id</dt>
        <dd className="break-all">
          {status.apiId || <span className="text-[#6C7381]">not set</span>}
        </dd>

        <dt className="font-semibold text-[#505258]">API key</dt>
        <dd>
          {status.hasApiKey ? (
            /*
             * Present or absent, never the value and never a prefix of it. A
             * prefix still narrows a brute force search for anyone who gets
             * a screenshot of this page.
             */
            <span className="font-semibold text-green-900">Set</span>
          ) : (
            <span className="text-[#6C7381]">not set</span>
          )}
        </dd>
      </dl>

      {status.problems.length > 0 && (
        <ul className="flex flex-col gap-1 border-t pt-4">
          {status.problems.map((problem) => (
            <li key={problem} className="text-base text-amber-900">
              {problem}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-[#6C7381] border-t pt-4">
        Set in <code className="font-mono font-semibold">.env.local</code> as{' '}
        <code className="font-mono">{envPrefix}_BASE_URL</code>,{' '}
        <code className="font-mono">{envPrefix}_API_ID</code>, and{' '}
        <code className="font-mono">{envPrefix}_API_KEY</code>. All 3 together, since 2 of 3 sends a
        request to the right host with no key and gets a 401 nobody reads.
      </p>
    </div>
  )
}

export default async function AdminIntegrationsPage() {
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const dialer = describe(dialerConfig())
  const crm = describe(crmConfig())

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/integrations"
      title="Integrations"
      description="What the reporting is connected to"
    >
      <div className="mb-6 bg-[#f7f7f7] border rounded-lg px-5 py-4 flex flex-col gap-2">
        <p className="text-base text-[#505258]">
          <strong className="text-ihealthBlue">Keys are never displayed here.</strong> This page
          says whether a credential is set, not what it is, so it is safe to screenshot and safe to
          share with whoever is doing the integration.
        </p>
        <p className="text-base text-[#505258]">
          Base urls must be https. These requests carry beneficiary names, phone numbers, and plan
          details, so plain http is rejected except on localhost.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <IntegrationCard status={dialer} envPrefix="LH_DIALER" />
        <IntegrationCard status={crm} envPrefix="LH_CRM" />
      </div>
    </AdminShell>
  )
}
