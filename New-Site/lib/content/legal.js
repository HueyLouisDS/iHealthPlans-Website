/**
 * Content for the 5 legal and compliance notices.
 *
 * ============================================================================
 * READ THIS BEFORE PUBLISHING ANY OF THESE PAGES.
 *
 * This is DRAFT text. It follows the standard structure for each notice and
 * uses the standard language where that language is set by regulation, but it
 * has NOT been reviewed by counsel and it is not legal advice.
 *
 * Every place a fact is needed that only the client can supply is written as a
 * string beginning "TO CONFIRM:". Those render as a visible amber block on the
 * page, so an unreviewed notice cannot be published without somebody noticing.
 * Resolve all of them, have counsel review the result, then delete this notice.
 *
 * Specific items counsel must rule on:
 * 1. Whether iHealth Plans is a covered entity under Section 1557 of the ACA.
 *    Agencies generally are not unless they receive federal financial
 *    assistance, but MA marketing obligations can still apply. That decides
 *    whether the nondiscrimination notice is required or merely good practice.
 * 2. The language assistance tagline list, which is set per state.
 * 3. Which state privacy laws they are in scope for, which depends on where
 *    their leads are and on volume thresholds.
 * 4. Call recording consent, which varies by state and interacts with the CMS
 *    requirement that TPMOs record calls with beneficiaries in their entirety.
 * ============================================================================
 */

// Rendered on every notice. A legal page with no date is not much use to
// anyone trying to work out which version they agreed to.
export const LEGAL_LAST_UPDATED = 'TO CONFIRM: effective date, set when counsel signs off'

export const LEGAL_PAGES = {
  accessibility: {
    slug: 'accessibility',
    title: 'Accessibility Statement | iHealth Plans',
    metaDescription:
      'How iHealth Plans approaches website accessibility, the standard we work to, and how to report a problem.',
    headline: 'Accessibility Statement',
    intro:
      'iHealth Plans is committed to making this website usable by as many people as possible, including people who use assistive technology. This statement explains the standard we work to, what we have done, what we know is not yet right, and how to tell us about a problem.',

    sections: [
      {
        heading: 'The standard we work to',
        body: [
          'We aim to conform to the Web Content Accessibility Guidelines (WCAG) version 2.1 at level AA. These guidelines explain how to make web content more accessible to people with a wide range of disabilities, including visual, hearing, cognitive, and motor impairments.',
          'TO CONFIRM: whether iHealth Plans wants to state conformance as "fully conformant", "partially conformant", or "aiming to conform". Only claim full conformance after an audit supports it, because the claim itself carries risk.',
        ],
      },
      {
        heading: 'What we have done',
        body: [
          'Accessibility is considered as part of how the site is built rather than added afterwards. Practical measures include the following.',
        ],
        list: [
          'Text and background colours are chosen to meet contrast requirements.',
          'Every form field has a visible label that is programmatically associated with it.',
          'The site can be operated with a keyboard alone, and no function depends on hovering a mouse.',
          'Images that carry meaning have text alternatives, and decorative images are hidden from assistive technology.',
          'Page structure uses real headings and landmarks so screen reader users can navigate by them.',
          'Text can be resized without loss of content or function.',
        ],
      },
      {
        heading: 'Known limitations',
        body: [
          'We are aware of the following and are working on them.',
          'TO CONFIRM: this section must list real, current issues. An accessibility statement that claims no known limitations is rarely accurate and undermines the rest of the page. Populate it from an audit.',
        ],
      },
      {
        heading: 'Telling us about a problem',
        body: [
          'If you cannot access something on this site, or you encounter a barrier, please tell us. We will work with you to provide the information or service you need through another means.',
        ],
        contacts: [
          { label: 'By phone', value: 'PHONE_NUMBER_WITH_TTY' },
          { label: 'By email', value: 'TO CONFIRM: accessibility contact email address' },
          { label: 'By post', value: 'TO CONFIRM: business mailing address' },
        ],
      },
      {
        heading: 'How we assess this site',
        body: [
          'TO CONFIRM: how accessibility is evaluated, for example self assessment, an external audit, or both, and how often. Name the evaluator if an external audit was carried out.',
        ],
      },
    ],
  },

  'nondiscrimination-notice': {
    slug: 'nondiscrimination-notice',
    title: 'Nondiscrimination Notice and Language Assistance | iHealth Plans',
    metaDescription:
      'iHealth Plans does not discriminate on the basis of race, color, national origin, age, disability, or sex. Free language assistance and auxiliary aids are available.',
    headline: 'Nondiscrimination Notice and Language Assistance',
    intro:
      'iHealth Plans complies with applicable civil rights laws and does not discriminate on the basis of race, color, national origin, age, disability, or sex.',

    sections: [
      {
        heading: 'Our commitment',
        body: ['iHealth Plans does not exclude people or treat them differently because of race, color, national origin, age, disability, or sex.'],
        list: [
          'We provide free aids and services to people with disabilities to help them communicate with us effectively, such as qualified sign language interpreters and written information in other formats.',
          'We provide free language services to people whose primary language is not English, such as qualified interpreters and information written in other languages.',
        ],
      },
      {
        heading: 'If you need these services',
        body: ['If you need any of the services described above, please contact us.'],
        contacts: [
          { label: 'By phone', value: 'PHONE_NUMBER_WITH_TTY' },
          { label: 'By email', value: 'TO CONFIRM: civil rights or compliance contact email address' },
        ],
      },
      {
        heading: 'Filing a grievance with us',
        body: [
          'If you believe we have failed to provide these services or discriminated in another way on the basis of race, color, national origin, age, disability, or sex, you can file a grievance with us.',
          'TO CONFIRM: the named civil rights coordinator, their address, phone, fax, and email, and the process and timeframe for handling a grievance. A grievance procedure that does not name a responsible person is not a procedure.',
        ],
      },
      {
        heading: 'Filing a complaint with the federal government',
        body: [
          'You can also file a civil rights complaint with the U.S. Department of Health and Human Services, Office for Civil Rights. Complaint forms are available on the HHS website.',
        ],
        contacts: [
          { label: 'Online', value: 'ocrportal.hhs.gov/ocr/portal/lobby.jsf' },
          { label: 'By phone', value: '1-800-368-1019, TDD 1-800-537-7697' },
          {
            label: 'By post',
            value:
              'U.S. Department of Health and Human Services, 200 Independence Avenue SW, Room 509F, HHH Building, Washington, DC 20201',
          },
        ],
        afterBody: [
          'TO CONFIRM: verify these HHS Office for Civil Rights contact details are current before publishing. They are stable but they are not ours to be wrong about.',
        ],
      },
      {
        heading: 'Language assistance',
        body: [
          'Language assistance services are available free of charge. The taglines below tell speakers of other languages how to get help in their own language.',
          'TO CONFIRM: the required tagline list is set per state, commonly the top 15 languages spoken in the states where you operate. Supply the correct list and the translated tagline text for each. Do not machine translate these.',
        ],
      },
    ],
  },

  'tpmo-disclosure': {
    slug: 'tpmo-disclosure',
    title: 'Third Party Marketing Organization Disclosure | iHealth Plans',
    metaDescription:
      'iHealth Plans is a Third Party Marketing Organization. This page explains what that means, which plans we represent, and how our calls are handled.',
    headline: 'Third Party Marketing Organization Disclosure',
    intro:
      'iHealth Plans is a Third Party Marketing Organization, or TPMO. This page explains what that means for you, what we can and cannot offer, and how we handle calls.',

    sections: [
      {
        heading: 'The plans we offer',
        body: [
          'We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE, or your local State Health Insurance Assistance Program, to get information on all of your options.',
          'TO CONFIRM: this is the standard TPMO disclaimer. Verify the exact wording against the current CMS marketing rule, and confirm it matches the version used across all other marketing materials so they do not diverge.',
        ],
      },
      {
        heading: 'How many organizations we represent',
        body: [
          'iHealth Plans represents Medicare Advantage organizations that have a Medicare contract. The number of organizations and products we represent in your area is stated in the footer of every page on this site.',
          'TO CONFIRM: the counts currently published are 10 organizations and 38 products. Confirm these are accurate for the current plan year, and set a process for updating them, because they change and a stale count is a misstatement.',
        ],
      },
      {
        heading: 'We are not connected to the government',
        body: [
          'iHealth Plans is not connected with or endorsed by the U.S. government or the federal Medicare program. We are a licensed insurance agency.',
        ],
      },
      {
        heading: 'Recording of calls',
        body: [
          'Calls with beneficiaries are recorded. Recording is a requirement placed on Third Party Marketing Organizations, and it applies to the entire call, including any enrollment discussion.',
          'TO CONFIRM: how recordings are stored, for how long, who can access them, and the notice given at the start of a call. Also confirm the position on state consent laws, since some states require all parties to consent and that interacts with the federal recording requirement.',
        ],
      },
      {
        heading: 'Licensed insurance agents',
        body: [
          'The people you speak to are licensed insurance agents. Whether an agent can discuss plans in your state depends on where they hold a licence.',
          'TO CONFIRM: how a consumer can verify an agent licence, and whether iHealth Plans wants to publish its own agency licence numbers by state.',
        ],
      },
    ],
  },

  'do-not-call': {
    slug: 'do-not-call',
    title: 'Do Not Call and Contact Preferences | iHealth Plans',
    metaDescription:
      'How to ask iHealth Plans to stop contacting you, how to withdraw consent to be contacted, and how to use the National Do Not Call Registry.',
    headline: 'Do Not Call and Contact Preferences',
    intro:
      'If you do not want to hear from us, you can tell us to stop at any time and we will. This page explains how to do that, and what happens when you do.',

    sections: [
      {
        heading: 'Asking us to stop contacting you',
        body: [
          'You can ask us to stop contacting you at any time, for any reason, and you do not have to give a reason. Your request applies whether or not you previously gave permission to be contacted.',
        ],
        contacts: [
          { label: 'By phone', value: 'PHONE_NUMBER_WITH_TTY' },
          { label: 'By email', value: 'TO CONFIRM: opt out request email address' },
          { label: 'By post', value: 'TO CONFIRM: business mailing address' },
        ],
        afterBody: [
          'TO CONFIRM: whether a self service opt out form should be added to this page. A form creates a timestamped record of the request, which is far better evidence than a phone note if a complaint is ever made.',
        ],
      },
      {
        heading: 'Withdrawing consent',
        body: [
          'If you previously agreed to be contacted, including agreeing to receive automated calls or text messages, you can withdraw that agreement at any time. Withdrawing it does not affect any coverage you already have and does not affect your ability to speak to us if you contact us later.',
          'You can withdraw consent by any reasonable means, including replying STOP to a text message, telling an agent on a call, or using any of the contact methods above.',
        ],
      },
      {
        heading: 'How long it takes',
        body: [
          'We add your request to our internal do not call list. Once it is recorded we stop making marketing contact.',
          'TO CONFIRM: state the maximum time to honour a request, and make sure the number stated matches the operational reality and the current FCC rule on revocation. Do not publish a timeframe the business cannot meet, because the published figure becomes the standard you are held to.',
        ],
      },
      {
        heading: 'The National Do Not Call Registry',
        body: [
          'Separately from us, you can add your number to the National Do Not Call Registry, which is operated by the Federal Trade Commission and applies to telemarketing calls generally.',
        ],
        contacts: [
          { label: 'Online', value: 'donotcall.gov' },
          { label: 'By phone', value: '1-888-382-1222, TTY 1-866-290-4236' },
        ],
        afterBody: [
          'Registering with the national registry does not by itself stop contact from a company you have an existing relationship with, so if you want us to stop, tell us directly as well.',
        ],
      },
      {
        heading: 'Records we keep',
        body: [
          'When you ask us to stop, we keep a record of the request so that we can honour it. That means we retain enough information to recognise your number or email and avoid contacting it again.',
          'TO CONFIRM: retention period for do not call records, and confirm this section is consistent with the privacy policy.',
        ],
      },
    ],
  },

  'privacy-rights': {
    slug: 'privacy-rights',
    title: 'Your Privacy Rights | iHealth Plans',
    metaDescription:
      'How to exercise your privacy rights with iHealth Plans, including access, correction, deletion, and opting out of the sale or sharing of personal information.',
    headline: 'Your Privacy Rights',
    intro:
      'Depending on where you live, you may have rights over the personal information we hold about you. This page explains those rights and how to exercise them. It sits alongside our privacy policy, which explains what we collect and why.',

    sections: [
      {
        heading: 'Rights you may have',
        body: [
          'Which of these apply to you depends on the law in your state. Where a right applies, we will not treat you differently for using it.',
        ],
        list: [
          'The right to know what personal information we have collected about you, where it came from, and who we have disclosed it to.',
          'The right to a copy of that information.',
          'The right to have inaccurate information corrected.',
          'The right to have your information deleted, subject to exceptions where we are required to keep it.',
          'The right to opt out of the sale or sharing of your personal information.',
          'The right to limit how sensitive personal information is used.',
          'The right not to receive discriminatory treatment for exercising any of these rights.',
        ],
      },
      {
        heading: 'Making a request',
        body: ['You can make a request using any of the methods below.'],
        contacts: [
          { label: 'By phone', value: 'PHONE_NUMBER_WITH_TTY' },
          { label: 'By email', value: 'TO CONFIRM: privacy request email address' },
          { label: 'Online', value: 'TO CONFIRM: whether a self service privacy request form will be provided' },
        ],
        afterBody: [
          'TO CONFIRM: several state laws require a specific intake method, and California requires a toll free number for businesses that collect personal information. Confirm the methods offered here satisfy every state you operate in.',
        ],
      },
      {
        heading: 'Opting out of sale or sharing',
        body: [
          'If we sell or share personal information as those terms are defined in your state, you can tell us to stop.',
          'TO CONFIRM: this is the question that matters most on this page. Lead generation businesses frequently transfer personal information in ways that meet the statutory definition of a sale or a share even when no money changes hands. Counsel must determine whether iHealth Plans sells or shares, because the answer decides whether a Do Not Sell or Share My Personal Information link is legally required in the site footer.',
        ],
      },
      {
        heading: 'Someone acting on your behalf',
        body: [
          'An authorised agent can make a request for you, and a person with power of attorney can act on behalf of the person they represent. We may need to verify both their authority and the identity of the person the request concerns.',
          'TO CONFIRM: the verification process for authorised agents and for holders of power of attorney. This matters more here than for most businesses, because a significant share of enquiries come from adult children and appointed representatives rather than from the beneficiary.',
        ],
      },
      {
        heading: 'How we verify a request',
        body: [
          'Before we act on a request we need to be reasonably sure you are who you say you are. What we ask for depends on the sensitivity of the information and the type of request.',
          'TO CONFIRM: the specific verification steps, and the response timeframe including any permitted extension.',
        ],
      },
      {
        heading: 'If you disagree with our decision',
        body: [
          'TO CONFIRM: several states require an appeal process where a request is refused, including how to appeal and how to escalate to a state attorney general. Confirm which states apply and add the process here.',
        ],
      },
    ],
  },
}

/**
 * Looks up one notice by slug.
 * Returns null rather than throwing so a route can decide what to do.
 */
export function getLegalPage(slug) {
  return LEGAL_PAGES[slug] || null
}

/**
 * The notices, in the order they should appear in the footer.
 * Object key order is the source of truth so the footer and the pages cannot
 * drift apart.
 */
export function getAllLegalPages() {
  return Object.values(LEGAL_PAGES)
}
