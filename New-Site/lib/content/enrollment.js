/**
 * Content for the 3 Medicare enrollment period pages, plus the shared window
 * definitions the product pages also render.
 * This is the single source of truth for enrollment timing across the site.
 * ENROLLMENT_WINDOWS previously lived in products.js and was moved here so the
 * dates are stated in exactly 1 place.
 *
 * COMPLIANCE NOTES, read before editing.
 * 1. This is Medicare marketing material. Changes here are content changes.
 * 2. The calendar dates below are set in regulation and stable year to year,
 *    unlike dollar figures, so they are safe to state directly. Penalty
 *    amounts and premiums are not stated anywhere, only the mechanism.
 * 3. Language stays hedged. Avoid absolutes about what someone can or will
 *    qualify for, since eligibility depends on individual circumstances.
 */

/*
 The 6 windows, in the order a person encounters them rather than calendar
 order. Rendered on the hub page and, in a shorter form, on product pages.
*/
export const ENROLLMENT_WINDOWS = [
  {
    slug: 'initial',
    name: 'Initial Enrollment Period',
    abbreviation: 'IEP',
    dates: '7 months around your 65th birthday',
    detail:
      'Begins 3 months before the month you turn 65, includes that month, and ends 3 months after. This is when most people first enroll, and enrolling early in the window generally means coverage starts sooner.',
  },
  {
    slug: 'annual',
    name: 'Annual Enrollment Period',
    abbreviation: 'AEP',
    dates: '15 October to 7 December',
    detail:
      'Each autumn you can join, switch, or drop a Medicare Advantage or Part D plan. Changes made during this window generally take effect on 1 January.',
    href: '/annual-enrollment-period',
  },
  {
    slug: 'ma-open',
    name: 'Medicare Advantage Open Enrollment',
    abbreviation: 'MA OEP',
    dates: '1 January to 31 March',
    detail:
      'If you are already in a Medicare Advantage plan you can switch to a different one, or return to Original Medicare, once during this window. It is not available to people who are in Original Medicare on 1 January.',
    href: '/medicare-advantage-open-enrollment',
  },
  {
    slug: 'general',
    name: 'General Enrollment Period',
    abbreviation: 'GEP',
    dates: '1 January to 31 March',
    detail:
      'For people who did not sign up for Part B when first eligible and do not qualify for a Special Enrollment Period. A late enrollment penalty may apply.',
  },
  {
    slug: 'medigap',
    name: 'Medigap Open Enrollment Period',
    abbreviation: 'Medigap OEP',
    dates: '6 months from Part B enrollment at 65',
    detail:
      'Begins the month you are both 65 or older and enrolled in Part B. During it you can buy any Medigap policy sold in your state regardless of your health. It does not repeat.',
  },
  {
    slug: 'special',
    name: 'Special Enrollment Period',
    abbreviation: 'SEP',
    dates: 'When your circumstances change',
    detail:
      'Certain life events, such as moving or losing other coverage, can open a window to make a change outside the usual periods. How long it lasts depends on the event.',
    href: '/special-enrollment-period',
  },
]

export const ENROLLMENT_PAGES = {
  'medicare-enrollment-periods': {
    slug: 'medicare-enrollment-periods',
    eyebrow: 'Medicare Timing',
    headline: 'Medicare Enrollment Periods',
    title: 'Medicare Enrollment Periods | iHealth Plans',
    metaDescription:
      'When you can enroll in Medicare or change your coverage depends on the enrollment period. Speak with a licensed insurance agent about which one applies to you.',
    intro:
      'When you can enroll in Medicare coverage, or change coverage you already have, depends on which enrollment period you are in. Missing one can mean waiting months for another chance, and in some cases paying a penalty for as long as you have coverage.',

    faqs: [
      {
        question: 'Which enrollment period applies to me?',
        answer:
          'It depends on your age, what coverage you have now, and whether anything has recently changed in your circumstances. Most people first use their Initial Enrollment Period around their 65th birthday, then use the Annual Enrollment Period each autumn. A licensed insurance agent can help you work out which one you are in.',
      },
      {
        question: 'What happens if I miss an enrollment period?',
        answer:
          'You may have to wait until the next one before you can enroll or make a change. Depending on which coverage you delayed, a late enrollment penalty may also be added to your premium.',
      },
      {
        question: 'Is the Medigap Open Enrollment Period the same as the Annual Enrollment Period?',
        answer:
          'No, and this is a common source of confusion. The Annual Enrollment Period each autumn applies to Medicare Advantage and Part D. The Medigap Open Enrollment Period is separate, lasts 6 months, starts when you are 65 or older and enrolled in Part B, and does not repeat.',
      },
      {
        question: 'Can I change my mind after enrolling?',
        answer:
          'Sometimes. If you are in a Medicare Advantage plan, the Medicare Advantage Open Enrollment Period between 1 January and 31 March lets you make one change. Outside that, it depends on whether a Special Enrollment Period applies to you.',
      },
    ],
  },

  'annual-enrollment-period': {
    slug: 'annual-enrollment-period',
    eyebrow: '15 October to 7 December',
    headline: 'Medicare Annual Enrollment Period',
    title: 'Medicare Annual Enrollment Period (AEP) | iHealth Plans',
    metaDescription:
      'The Medicare Annual Enrollment Period runs 15 October to 7 December. Review your options with a licensed insurance agent before the window closes.',
    intro:
      'The Annual Enrollment Period runs from 15 October to 7 December each year. It is the main opportunity to join, switch, or drop a Medicare Advantage or Part D plan, and changes you make generally take effect on 1 January.',

    canDo: {
      heading: 'What you can do during the Annual Enrollment Period',
      items: [
        'Join a Medicare Advantage plan for the first time.',
        'Switch from one Medicare Advantage plan to another.',
        'Leave a Medicare Advantage plan and return to Original Medicare.',
        'Join, switch, or drop a Part D prescription drug plan.',
      ],
    },

    cannotDo: {
      heading: 'What the Annual Enrollment Period does not cover',
      items: [
        {
          term: 'Buying a Medigap policy without underwriting',
          detail:
            'Medicare Supplement policies are not part of this window. Whether you can buy one, and what you pay, depends on your Medigap Open Enrollment Period or a guaranteed issue right.',
        },
        {
          term: 'Enrolling in Part B for the first time',
          detail:
            'If you missed Part B when first eligible, the General Enrollment Period between 1 January and 31 March is generally the route, unless a Special Enrollment Period applies to you.',
        },
        {
          term: 'Unlimited changes after 7 December',
          detail:
            'Once the window closes, your choice generally stands for the year unless you qualify for another enrollment period.',
        },
      ],
    },

    whyReview: {
      heading: 'Why it is worth reviewing even if you are happy',
      body: [
        'Plans are approved year by year, and the plan you have in December may not be the same plan in January. Formularies change, provider networks change, and costs such as copays and deductibles can change with them.',
        'Your plan is required to send you an Annual Notice of Change before the window opens, usually by the end of September. It sets out what is changing for the coming year, and it is the document worth reading before you decide to stay put.',
        'Your own circumstances change too. A new prescription or a new provider can make a plan that suited you last year a poor fit this year.',
      ],
    },

    checklist: {
      heading: 'What to check before you decide',
      items: [
        { term: 'Your prescriptions', detail: 'Confirm each one is still on the plan’s formulary and check which tier it sits in for the coming year.' },
        { term: 'Your providers', detail: 'Check that the doctors and facilities you use are still in the plan’s network for next year.' },
        { term: 'Your pharmacy', detail: 'Preferred and standard pharmacies can change, and the same prescription can cost a different amount at each.' },
        { term: 'Your total costs', detail: 'Look at premiums, deductibles, copays, and the annual out of pocket maximum together rather than the premium alone.' },
      ],
    },

    faqs: [
      {
        question: 'When do changes made during the Annual Enrollment Period take effect?',
        answer:
          'Generally on 1 January of the following year. If you make more than one change during the window, the last one you make before 7 December is the one that takes effect.',
      },
      {
        question: 'What if I do nothing?',
        answer:
          'In most cases your current plan continues into the next year with whatever changes it has made, provided the plan is still being offered. If your plan is not returning, you should be notified and you may need to choose another.',
      },
      {
        question: 'Can I change my mind after 7 December?',
        answer:
          'If you end up in a Medicare Advantage plan, the Medicare Advantage Open Enrollment Period between 1 January and 31 March lets you make one further change. Otherwise it depends on whether a Special Enrollment Period applies to you.',
      },
      {
        question: 'Is this the same as open enrollment for other insurance?',
        answer:
          'No. Medicare has its own enrollment periods with their own dates, separate from the open enrollment periods used by employer plans or the health insurance marketplace.',
      },
    ],
  },

  'medicare-advantage-open-enrollment': {
    slug: 'medicare-advantage-open-enrollment',
    eyebrow: '1 January to 31 March',
    headline: 'Medicare Advantage Open Enrollment',
    title: 'Medicare Advantage Open Enrollment Period | iHealth Plans',
    metaDescription:
      'The Medicare Advantage Open Enrollment Period runs 1 January to 31 March. If you are already in a Medicare Advantage plan you can make one change.',
    intro:
      'The Medicare Advantage Open Enrollment Period runs from 1 January to 31 March each year. It exists so that someone who has started the year in a Medicare Advantage plan and finds it is not working for them is not stuck with it until the following January.',

    /*
     This page's whole reason to exist is that people confuse this window
     with the Annual Enrollment Period. Who it applies to leads everything.
    */
    whoItIsFor: {
      heading: 'Who can use this window',
      items: [
        'You are enrolled in a Medicare Advantage plan on 1 January.',
        'You want to make a change to that coverage between 1 January and 31 March.',
        'You have not already used this window in the same year, it allows one change.',
      ],
    },

    canDo: {
      heading: 'What you can do',
      items: [
        'Switch from your Medicare Advantage plan to a different Medicare Advantage plan.',
        'Leave your Medicare Advantage plan and return to Original Medicare.',
        'Join a standalone Part D prescription drug plan when you return to Original Medicare.',
      ],
    },

    cannotDo: {
      heading: 'What this window does not allow',
      items: [
        {
          term: 'Joining Medicare Advantage from Original Medicare',
          detail:
            'If you were in Original Medicare on 1 January, this window is not open to you. Joining a Medicare Advantage plan generally waits for the Annual Enrollment Period, unless a Special Enrollment Period applies.',
        },
        {
          term: 'Adding Part D while staying in Original Medicare',
          detail:
            'You can pick up a standalone drug plan on the way out of a Medicare Advantage plan. If you were already in Original Medicare, this window does not let you add one.',
        },
        {
          term: 'More than one change',
          detail:
            'This window allows a single change. Once it is made, the next opportunity is generally the Annual Enrollment Period, unless a Special Enrollment Period applies.',
        },
        {
          term: 'Buying a Medigap policy without underwriting',
          detail:
            'Leaving a Medicare Advantage plan during this window does not by itself create a guaranteed issue right to buy a Medicare Supplement policy. Whether one applies depends on your circumstances and is worth checking before you make the change.',
        },
      ],
    },

    timing: {
      heading: 'How this differs from the Annual Enrollment Period',
      body: [
        'Both are sometimes called open enrollment, which is where most of the confusion comes from. They are separate windows with different rules.',
        'The Annual Enrollment Period runs 15 October to 7 December, is open to everyone with Medicare, and changes take effect on 1 January. This window runs 1 January to 31 March, is only open to people already in a Medicare Advantage plan, and allows one change.',
        'A change made during this window generally takes effect on the first day of the month after the plan receives your request, rather than waiting until the following January.',
      ],
    },

    faqs: [
      {
        question: 'How is this different from the Annual Enrollment Period?',
        answer:
          'The Annual Enrollment Period runs 15 October to 7 December and is open to everyone with Medicare. This window runs 1 January to 31 March and is only for people who are already in a Medicare Advantage plan. It also allows a single change rather than as many as you like.',
      },
      {
        question: 'When does my change take effect?',
        answer:
          'Generally on the first day of the month after your new plan receives your request. That is different from the Annual Enrollment Period, where changes take effect on 1 January.',
      },
      {
        question: 'Can I use this window to join a Medicare Advantage plan?',
        answer:
          'Not if you were in Original Medicare on 1 January. This window is for changing or leaving a Medicare Advantage plan you already have.',
      },
      {
        question: 'Is this the same as the General Enrollment Period?',
        answer:
          'No, although they run over the same dates. The General Enrollment Period is for people who did not sign up for Part B when first eligible. This window is about changing Medicare Advantage coverage you already have.',
      },
    ],
  },

  'special-enrollment-period': {
    slug: 'special-enrollment-period',
    eyebrow: 'When your circumstances change',
    headline: 'Medicare Special Enrollment Periods',
    title: 'Medicare Special Enrollment Periods (SEP) | iHealth Plans',
    metaDescription:
      'Certain life events can let you change Medicare coverage outside the usual windows. Speak with a licensed insurance agent about whether one applies to you.',
    intro:
      'A Special Enrollment Period is a window to enroll in Medicare coverage, or change the coverage you have, outside the usual enrollment periods. It opens because something has changed in your circumstances, and how long it lasts depends on the event.',

    events: {
      heading: 'Events that may open a Special Enrollment Period',
      items: [
        {
          term: 'You move',
          detail:
            'Moving out of your plan’s service area, or moving somewhere with plan options your current address did not have, may open a window to change.',
        },
        {
          term: 'You lose other coverage',
          detail:
            'Losing employer or union coverage, or other creditable coverage, may allow you to enroll without waiting for the next general window.',
        },
        {
          term: 'Your Medicaid status changes',
          detail:
            'Gaining, losing, or changing Medicaid eligibility may open a window, and people who are dually eligible often have more frequent opportunities to change.',
        },
        {
          term: 'You qualify for Extra Help',
          detail:
            'Becoming eligible for the Extra Help program with Part D costs may allow a change outside the usual periods.',
        },
        {
          term: 'You move into or out of an institution',
          detail:
            'Moving into, living in, or leaving a skilled nursing facility or long term care hospital may open a window.',
        },
        {
          term: 'Your plan changes',
          detail:
            'If your plan leaves the Medicare program, stops serving your area, or its contract is not renewed, you should be notified and given an opportunity to choose another.',
        },
        {
          term: 'You want to join a 5 star plan',
          detail:
            'Where a plan with a 5 star quality rating is available in your area, there is a window each year to switch into it.',
        },
        {
          term: 'Other circumstances',
          detail:
            'Other situations can qualify, including certain errors, contract issues, and declared emergencies. If something has changed for you, it is worth asking.',
        },
      ],
    },

    timing: {
      heading: 'How long a Special Enrollment Period lasts',
      body: [
        'There is no single answer, because the window depends on which event opened it. Many last about 2 months from the event or from when you were notified, whichever is later. Some are longer, and a few are ongoing for as long as the circumstance applies.',
        'Because the timing varies and the windows are often short, the practical advice is the same in every case. If something has changed, ask sooner rather than waiting, since the window may already be running.',
      ],
    },

    faqs: [
      {
        question: 'How do I know whether I qualify for a Special Enrollment Period?',
        answer:
          'It depends on what changed and when. The list of qualifying events is long and some of them are not obvious. A licensed insurance agent can talk through your circumstances and help you understand whether a window is open to you.',
      },
      {
        question: 'Do I need to prove the event happened?',
        answer:
          'In some cases documentation is requested, for example a new address or a letter showing when other coverage ended. Keeping paperwork about the change is worthwhile.',
      },
      {
        question: 'Does a Special Enrollment Period let me buy a Medigap policy?',
        answer:
          'Not automatically. Medigap has its own rules, and some circumstances create a guaranteed issue right to buy a policy. Whether one applies to you depends on the specific situation, so it is worth checking rather than assuming.',
      },
      {
        question: 'What if my window has already closed?',
        answer:
          'You may need to wait for the next general enrollment period. Which one applies depends on the coverage you are trying to change, so it is worth finding out rather than assuming you have to wait a full year.',
      },
    ],
  },
}

/**
 * Looks up one enrollment page by slug.
 * Returns null rather than throwing so a route can decide what to do.
 */
export function getEnrollmentPage(slug) {
  return ENROLLMENT_PAGES[slug] || null
}
