/**
 * Content for the 5 legal and compliance notices.
 */

import { CARRIER_COUNT, PRODUCT_COUNT } from '@/lib/siteConfig'

// Thousands separated, matching the approved material. Locale pinned so a
// server in another region cannot render it with a different separator.
const productCount = PRODUCT_COUNT.toLocaleString('en-US')

/*=============================================
    READ THIS BEFORE PUBLISHING ANY OF THESE PAGES.

    This is DRAFT text. It follows the standard structure for each notice and
    uses the standard language where that language is set by regulation, but it
    has NOT been reviewed by counsel and it is not legal advice.

    Every place a fact is needed that only the client can supply is written as a
    string beginning "TO CONFIRM:". Those render as a visible amber block on the
    page, so an unreviewed notice cannot be published without somebody noticing.
    Resolve all of them, have counsel review the result, then delete this notice.

    Specific items counsel must rule on:
    1. Whether iHealth Plans is a covered entity under Section 1557 of the ACA.
       Agencies generally are not unless they receive federal financial
       assistance, but MA marketing obligations can still apply. That decides
       whether the nondiscrimination notice is required or merely good practice.
    2. The language assistance tagline list, which is set per state.
    3. Which state privacy laws they are in scope for, which depends on where
       their leads are and on volume thresholds.
    4. Call recording consent, which varies by state and interacts with the CMS
       requirement that TPMOs record calls with beneficiaries in their entirety.
=============================================*/

/*
 Rendered on every notice. A legal page with no date is not much use to
 anyone trying to work out which version they agreed to.
*/
export const LEGAL_LAST_UPDATED = 'December 1, 2026'

/*
 The TPMO disclosure and the privacy policy both have to describe call
 recording, and they were answered with one set of facts, so they share one
 block. Two copies would drift, and two legal pages disagreeing about a
 retention period is worse than either page being silent.
*/
export const CALL_RECORDING_BODY = [
  'You are told at the start of every call that it is being recorded, and the other disclosures CMS requires are given at the same time.',
  'Some states require every person on a call to agree before it can be recorded. Where that applies the agent will ask you out loud for that agreement before going any further, and if you do not give it the call cannot continue. The federal recording requirement does not override the consent law of your state.',
  'Recordings are held securely and are not altered. They are kept in a system that allows them to be retrieved when CMS, an insurance carrier, or another regulator asks for them as part of an audit.',
  'Marketing and sales calls are kept for 6 years, as audio for the first 3 years and as either audio or a written transcript for years 4 through 6. Calls that involve an enrollment are kept for 10 years, which is required by 42 CFR 422.504(d).',
]

export const LEGAL_PAGES = {
  'terms-of-service': {
    slug: 'terms-of-service',
    title: 'Terms of Service | iHealth Plans',
    metaDescription:
      'The terms that apply to using the iHealth Plans website, what we do and do not do, and the limits of the information published here.',
    headline: 'Terms of Service',
    intro:
      'These terms apply when you use this website or contact us through it. Please read the section below headed what we do and what we do not do, because the distinction matters and it is easy to get wrong.',

    sections: [
      {
        heading: 'What we do, and what we do not do',
        body: [
          'iHealth Plans is a licensed insurance agency and a Third Party Marketing Organization. We help people compare Medicare Advantage and Part D plan options and, if they choose to enroll, we help them submit an application.',
        ],
        list: [
          'We do not issue insurance plans. Plans are issued by insurance companies that hold a contract with Medicare, and any coverage you obtain is between you and that company.',
          'We do not offer every plan available in your area. Our footer states how many organizations and products we represent. For information on all of your options, contact Medicare.gov, 1-800-MEDICARE, or your State Health Insurance Assistance Program.',
          'We are not connected with or endorsed by the U.S. government or the federal Medicare program.',
          'We do not provide medical, legal, or tax advice.',
        ],
        afterBody: [
          'An earlier version of these terms said iHealth Plans "provides Medicare-related insurance plans". That was inaccurate, it contradicted our own Federal Contracting Statement, and it has been corrected here.',
        ],
      },
      {
        heading: 'Who can use this site',
        body: [
          'This site is intended for adults in the United States who are able to enter into a binding agreement. It is not intended for children.',
          'There is no account to create and nothing to log into. An earlier version of these terms referred to your account information and to terminating your access, neither of which exists for visitors to this site.',
        ],
      },
      {
        heading: 'The information published here',
        body: [
          'Everything on this site, including the education articles, is general information about how Medicare works. It is not advice about your situation, and it is not a statement of what any particular plan covers or costs.',
          'Plan availability, benefits, provider networks, formularies, and costs are set by the insurance companies and change from one plan year to the next. What is accurate when it is published may not be accurate later. Confirm the details of any specific plan with a licensed insurance agent or with the plan itself before you rely on them.',
        ],
      },
      {
        heading: 'Contacting us, and us contacting you',
        body: [
          'If you give us your contact details, a licensed insurance agent may contact you about plan options. What you agree to when you submit a form is set out in full next to that form, and you can withdraw it at any time through our Do Not Call page.',
          'Calls between you and a licensed insurance agent are recorded, including any enrollment discussion. Recording is a requirement placed on Third Party Marketing Organizations. Our Privacy Policy explains how recordings are handled.',
        ],
      },
      {
        heading: 'Enrolling in a plan',
        body: [
          'If you decide to enroll, we may help you complete and submit the application, but the enrollment itself is between you and the insurance company. Acceptance, effective dates, and the terms of your coverage are determined by that company and by Medicare, not by us.',
          'Nothing on this site is an offer of insurance, and submitting a form does not enroll you in anything.',
        ],
      },
      {
        heading: 'Your responsibilities',
        body: [
          'Please give us accurate information. Eligibility for a plan, and which plans are available to you, depend on things like where you live and whether you have Medicaid, so inaccurate details can lead to a recommendation that does not actually apply to you.',
        ],
      },
      {
        heading: 'Content on this site',
        body: [
          'The text, images, and design of this site belong to iHealth Plans or to whoever licensed them to us. You are welcome to read, print, and share pages for your own use. Please do not republish or use them commercially without asking.',
          'Plan names, carrier names, and their logos belong to the companies that own them, and appear here only to identify their plans.',
        ],
      },
      {
        heading: 'Links to other sites',
        body: [
          'We link to other sites, including Medicare.gov and insurance company sites, where that is the better source. We do not control those sites and we are not responsible for their content or their privacy practices.',
        ],
      },
      {
        heading: 'Disclaimers and limits on liability',
        body: [
          'This site is provided as it is. We work to keep it accurate and available, but we do not promise it will be uninterrupted or free of errors.',
          'TO CONFIRM: the disclaimer and limitation of liability wording is a decision for counsel. Consumer facing limitations are read narrowly by courts and some are unenforceable in some states, so a broad carve out copied from a software agreement may not do what it appears to do. Note also that the previous version required consumers to indemnify iHealth Plans, which is unusual in a consumer context and worth a deliberate decision rather than inheritance.',
        ],
      },
      {
        heading: 'If something goes wrong',
        body: [
          'If you are unhappy with something, please tell us first. Most problems are resolved fastest by talking to us.',
          'TO CONFIRM: whether these terms should include an arbitration clause and a class action waiver. That is a significant decision with real consequences for consumers and for the business, and it should be made deliberately rather than by copying a template. If one is included it has to be presented clearly and it must not be buried.',
        ],
      },
      {
        heading: 'Which law applies',
        body: [
          'TO CONFIRM: name the state. The previous version said the laws of the state in which iHealth Plans is headquartered, without saying which state that is, so a reader could not tell which law governed the agreement they were being asked to accept. Insurance is also regulated state by state, and nothing in these terms limits any right you have under the law of your own state.',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms. When we do we will change the date shown at the top of this page.',
          'TO CONFIRM: the previous version reserved the right to change the terms without notice. Changing consumer terms with no notice at all is difficult to enforce. Decide what notice is actually given, and say that instead.',
        ],
      },
      {
        heading: 'Contact us',
        body: ['If you have a question about these terms, contact us.'],
        contacts: [
          { label: 'By phone', value: 'PHONE_NUMBER_WITH_TTY' },
          { label: 'By email', value: 'contracting@ihealthplans.com' },
          { label: 'By post', value: 'iHealth Plans LLC, 1166 W Newport Center Dr. #312, Deerfield Beach, FL 33442' },
        ],
      },
    ],
  },

  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy | iHealth Plans',
    metaDescription:
      'How iHealth Plans collects, uses, shares, and protects your personal information, including call recording and website tracking.',
    headline: 'Privacy Policy',
    intro:
      'This policy explains what personal information iHealth Plans collects, why we collect it, who we share it with, and what control you have over it. iHealth Plans is a licensed insurance agency and a Third Party Marketing Organization. We are not an insurance company and we are not a health care provider.',

    sections: [
      {
        heading: 'Information you give us',
        body: ['You give us information directly when you contact us or complete a form on this site.'],
        list: [
          'Your name and contact details, including phone number and zip code.',
          'Whether the enquiry is for you or for somebody you are helping, such as a parent or a person you hold power of attorney for.',
          'When you would prefer to be called.',
          'Anything you tell an agent during a call, which may include the medications you take, the providers you see, and your eligibility for Medicare or Medicaid, because those determine which plans are available to you.',
        ],
        afterBody: [
          'TO CONFIRM: the previous version of this policy claimed to collect treatment plans and medical history. An insurance agency generally holds neither. Confirm exactly what is collected, and whether any of it is health information as defined by HIPAA, because that answer changes the obligations attached to it.',
        ],
      },
      {
        heading: 'Information collected automatically',
        body: [
          'When you use this website we collect technical information about the visit, including the pages you view, the site or advertisement that sent you, your approximate location derived from your network address, the device and browser you are using, and identifiers stored on your device.',
          'We use this to understand which pages and campaigns lead people to contact us, so we can improve them.',
        ],
      },
      {
        heading: 'Calls are recorded',
        body: [
          'Calls between you and a licensed insurance agent are recorded, including any enrollment discussion. Recording is a requirement placed on Third Party Marketing Organizations, not a choice we make call by call.',
          'Recordings, and any transcript made from them, are treated as personal information under this policy.',
          ...CALL_RECORDING_BODY,
        ],
      },
      {
        heading: 'Cookies and similar technologies',
        body: [
          'We use cookies and similar technologies to keep track of a visit, to remember which advertisement or search brought you here, and to measure whether a page led to a call or an enquiry.',
          'TO CONFIRM: the full list of cookies and tags in use, including any advertising pixels, and whether a consent banner is required for the states you operate in. The site already runs analytics and an advertising pixel, and neither is described anywhere today.',
        ],
      },
      {
        heading: 'How we use your information',
        list: [
          'To have a licensed insurance agent contact you about Medicare Advantage and Part D plan options.',
          'To work out which plans are available where you live and which fit what you have told us.',
          'To submit an enrollment application on your behalf if you decide to enroll.',
          'To measure which advertising, pages, and campaigns produce enquiries.',
          'To meet legal, regulatory, and supervisory obligations, including call recording and record keeping.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: ['We share personal information in the following circumstances, and not otherwise.'],
        list: [
          'Licensed insurance agents, so that somebody can contact you and answer your questions.',
          'Insurance carriers, where you ask us to submit an application or where a plan needs the information to process it.',
          'Service providers who work for us, such as our telephone system and the systems that store our records. They may only use the information to provide that service to us.',
          'Regulators and law enforcement, where the law requires it.',
        ],
        afterBody: [
          'We do not share your information with health care providers for treatment purposes. An earlier version of this policy said we did, which was inaccurate for an insurance agency.',
        ],
      },
      {
        heading: 'Selling or sharing your information',
        body: [
          'We do not sell your personal information, and we do not share it for cross context behavioral advertising. Both of those terms carry a specific meaning under state privacy law, and neither one describes what we do.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'TO CONFIRM: retention periods, stated separately for lead records, call recordings, enrollment records, and do not call records. Medicare marketing and enrollment records carry their own retention requirements, so this cannot be a single number and it should not be guessed at.',
        ],
      },
      {
        heading: 'How we protect it',
        body: [
          'We restrict access to personal information to the people who need it to do their job, and we hold it in systems protected by access controls.',
          'TO CONFIRM: describe the actual measures rather than asserting they are robust. A policy that says security is taken seriously and then lists nothing is worth little to a reader and no more than that to a regulator.',
        ],
      },
      {
        heading: 'Your choices and rights',
        body: [
          'You can ask us to stop contacting you at any time, and you can withdraw any consent you gave to be contacted. Our Do Not Call page explains how.',
          'Depending on where you live you may also have rights to see, correct, or delete the information we hold, and to opt out of its sale or sharing. Our Your Privacy Rights page explains those and how to use them.',
        ],
      },
      {
        heading: 'Children',
        body: [
          'This site is intended for adults. We do not knowingly collect information from children. If you believe a child has given us information, contact us and we will delete it.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'We may update this policy. When we do we will change the date shown at the top of this page, and we will tell you directly if the change is significant.',
        ],
      },
      {
        heading: 'Contact us',
        body: ['If you have a question about this policy, or about information we hold, contact us.'],
        contacts: [
          { label: 'By phone', value: 'PHONE_NUMBER_WITH_TTY' },
          { label: 'By email', value: 'contracting@ihealthplans.com' },
          { label: 'By post', value: 'iHealth Plans LLC, 1166 W Newport Center Dr. #312, Deerfield Beach, FL 33442' },
        ],
      },
    ],
  },

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
          { label: 'By email', value: 'contracting@ihealthplans.com' },
          { label: 'By post', value: 'iHealth Plans LLC, 1166 W Newport Center Dr. #312, Deerfield Beach, FL 33442' },
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
          { label: 'By email', value: 'contracting@ihealthplans.com' },
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
          `We do not offer every plan available in your area. Currently we represent ${CARRIER_COUNT} organizations which offer ${productCount} products in your area. Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Program (SHIP) to get information on all of your options.`,
        ],
      },
      {
        heading: 'How many organizations we represent',
        body: [
          `iHealth Plans represents Medicare Advantage organizations that have a Medicare contract. We currently represent ${CARRIER_COUNT} organizations offering ${productCount} products, and the same figures appear in the footer of every page on this site.`,
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
          ...CALL_RECORDING_BODY,
        ],
      },
      {
        heading: 'Licensed insurance agents',
        body: [
          'The people you speak to are licensed insurance agents. Whether an agent can discuss plans in your state depends on where they hold a license.',
          'You can check the license of any agent yourself. The Department of Insurance in your state holds the record, and the NIPR Consumer Portal and the SBS License Manager both let you search nationally. Each of these will tell you whether a license is active, what lines of authority it covers, and whether there is any disciplinary history against it.',
          'We keep a complete internal register of the licenses this agency holds, and we will provide our license information on request.',
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
          { label: 'By email', value: 'contracting@ihealthplans.com' },
          { label: 'By post', value: 'iHealth Plans LLC, 1166 W Newport Center Dr. #312, Deerfield Beach, FL 33442' },
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
          'A request made through this website takes effect immediately. It is sent to our calling system the moment you submit it, so nobody has to enter it by hand.',
          'TO CONFIRM: the immediate timeframe above holds only for the opt out form on this page, which is not built yet and needs the dialer endpoint to post to. Until it is live a request arrives by email and is entered by a person, so this section overstates what happens. Decide also whether to state the FCC backstop of 10 business days for requests that arrive any other way.',
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
          'When you ask us to stop, we keep a record of the request so that we can honor it. That means we retain enough information to recognise your number or email and avoid contacting it again.',
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
          { label: 'By email', value: 'contracting@ihealthplans.com' },
          { label: 'Online', value: 'TO CONFIRM: whether a self service privacy request form will be provided' },
        ],
        afterBody: [
          'TO CONFIRM: several state laws require a specific intake method, and California requires a toll free number for businesses that collect personal information. Confirm the methods offered here satisfy every state you operate in.',
        ],
      },
      {
        heading: 'Opting out of sale or sharing',
        body: [
          'We do not sell your personal information, and we do not share it for cross context behavioral advertising.',
          'You can still ask us to opt you out. We will honor that request even though there is nothing here that it applies to.',
        ],
      },
      {
        heading: 'Someone acting on your behalf',
        body: [
          'An authorized agent can make a request for you, and a person with power of attorney can act on behalf of the person they represent. We verify their authority and the identity of the person the request concerns before we act on it.',
          'Before anything specific to you is discussed, the agent asks the person contacting us to confirm what authority they hold, and records that statement on the call.',
          'Acceptable proof is a power of attorney document, a court order, or a CMS approved representative form. After an enrollment the carrier may also ask for that documentation to be sent in.',
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
