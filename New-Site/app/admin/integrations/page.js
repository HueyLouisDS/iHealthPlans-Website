// Integration status and setup, /admin/integrations.
//
// Answers whether each integration is connected, without ever showing the
// credential that connects it. Everything rendered comes through describe(),
// which reports whether a key is present and never what it is.
//
// Server component. lib/integrations/config.js carries `import 'server-only'`,
// so the described shape is passed down to the client card rather than the
// config itself, which is what keeps the key off the boundary.

import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import IntegrationCards from '@/components/admin/IntegrationCard'
import { crmConfig, vendorConfig, describe, describeVendor } from '@/lib/integrations/config'
import { describeWritableKeys, envWritesEnabled } from '@/lib/integrations/envFile'

export const dynamic = 'force-dynamic'

export default async function AdminIntegrationsPage() {
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const crm = describe(crmConfig())
  const post = describeVendor(vendorConfig())

  /*
   Both must be set, since either one empty locks everybody out. The domain is
   environment only, so the card reads it but never offers to change it. The
   allowlist is not a credential and is passed down in full, which is what the
   chips render from.
  */
  const adminDomain = String(process.env.LH_ADMIN_ALLOWED_DOMAIN || '').trim().toLowerCase()
  const adminEmails = String(process.env.LH_ADMIN_ALLOWED_EMAILS || '').trim()

  const adminProblems = []
  if (!adminDomain) adminProblems.push('LH_ADMIN_ALLOWED_DOMAIN is not set in the environment.')
  if (!adminEmails) adminProblems.push('No addresses are listed, so nobody can sign in.')

  const statuses = {
    admin: { isConfigured: adminProblems.length === 0, problems: adminProblems },
    crm: { isConfigured: crm.isConfigured, problems: crm.problems },
    vendor: { isConfigured: post.isConfigured, problems: post.problems },
  }

  const canWrite = envWritesEnabled()

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
          Click a variable name to set it. Base urls must be https, since these requests carry
          beneficiary names, phone numbers, and plan details.
        </p>
        {!canWrite && (
          <p className="text-base text-amber-900">
            This is a deployed environment, so the fields are read only. Set these in the host&apos;s
            own environment configuration instead.
          </p>
        )}
      </div>

      <IntegrationCards
        statuses={statuses}
        present={describeWritableKeys()}
        /*
         statuses is empty until admin_users exists, so every address renders
         as unverified. Being on the list is permission, verification is proof
         the person completed a Google sign in, and the two are not the same.
        */
        admin={{ domain: adminDomain, emails: adminEmails, statuses: {} }}
        canWrite={canWrite}
      />
    </AdminShell>
  )
}
