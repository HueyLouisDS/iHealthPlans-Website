// The privacy request form, linked from the Online row on the privacy rights
// page. Its own route rather than a section of that page, because the form is
// a document being created and the notice around it is reading material.

import { HeaderSpacer } from '@/components/layout/Header'
import PrivacyRequestForm from '@/components/forms/PrivacyRequestForm'
import { COPY, COPY_PENDING } from '@/lib/content/privacyRequest'

export const metadata = {
  title: COPY.pageTitle,
  description: COPY.metaDescription,
  // Nothing here should be indexed while the copy is placeholder text
  robots: COPY_PENDING ? { index: false, follow: false } : undefined,
}

/*-------- This is critical --------*/
/*
 While COPY_PENDING is true the form does not render at all. Every label on it
 is placeholder text, and the ticked attestation is stored verbatim as the
 written demand sent to the dialer vendor, so a submission made against
 placeholder wording is evidence of nothing.

 Turning this off is a deliberate act taken after the copy is signed off, not
 something to do to see the page.
*/
function Pending() {
  return (
    <div className="w-full max-w-xl mx-auto border-l-4 border-l-amber-500 bg-amber-50 px-5 py-4 rounded-r-lg">
      <p className="text-sm font-bold uppercase tracking-[1.2px] text-amber-800 mb-1">
        To confirm before publishing
      </p>
      <p className="text-lg text-amber-900">
        The privacy request form is built and wired, but none of its wording has been written.
        Fill in lib/content/privacyRequest.js and set COPY_PENDING to false. Until then the page
        is noindex and the form is hidden, because the sentence somebody ticks is stored as their
        written request.
      </p>
    </div>
  )
}

export default function PrivacyRequestPage() {
  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <div className="w-full bg-[#f7f7f7] border-b">
          <div className="w-full max-w-4xl mx-auto px-4 py-14 flex flex-col items-start gap-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-ihealthBlue">
              {COPY_PENDING ? 'Privacy request' : COPY.headline}
            </h1>
            {!COPY_PENDING && <p className="text-lg leading-relaxed">{COPY.intro}</p>}
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-4 py-12">
          {COPY_PENDING ? <Pending /> : <PrivacyRequestForm />}
        </div>
      </main>
    </>
  )
}
