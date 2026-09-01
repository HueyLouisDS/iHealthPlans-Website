// The TCPA and TPMO disclosure that must appear on any form collecting contact
// details for a licensed agent to follow up on.

/*=============================================
    WHY THIS IS A COMPONENT AND NOT PASTED INTO THE FORM
=============================================*/

/*
 The wording itself moved to lib/content/consent.js and this renders it. The
 form sends the same definition flattened to text, and that string is what
 lead_consents stores as the record of what somebody agreed to.

 Do not reword anything here. A sentence edited in this file and not in the
 module would put one thing on screen and a different thing in the evidence,
 which is the exact failure the verbatim capture exists to prevent.
*/

import { consentParagraphs } from '@/lib/content/consent'

function Segment({ segment }) {
  if (typeof segment === 'string') return segment
  if (segment.strong) return <span className="font-semibold">{segment.strong}</span>

  return (
    <a href={segment.href} className="text-[#105fa8] hover:underline">
      {segment.link}
    </a>
  )
}

export default function TcpaConsent() {
  const paragraphs = consentParagraphs()

  // The SMID line is the last paragraph and is set quieter than the rest
  const lastIndex = paragraphs.length - 1

  return (
    <div className="w-full text-sm text-[#505258] leading-relaxed flex flex-col gap-3">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index === lastIndex ? 'text-[#6C7381]' : undefined}>
          {paragraph.map((segment, position) => (
            <Segment key={position} segment={segment} />
          ))}
        </p>
      ))}
    </div>
  )
}
