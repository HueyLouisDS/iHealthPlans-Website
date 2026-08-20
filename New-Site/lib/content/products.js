/**
 * Content for the 4 Medicare product landing pages.
 * Kept as data rather than markup so all 4 pages render through one reviewed
 * template, and so a compliance reviewer can read the copy without reading JSX.
 *
 * COMPLIANCE NOTES, read before editing.
 * 1. This is Medicare marketing material. Every change here is a content
 *    change subject to review, not a code change.
 * 2. Nothing on these pages states a plan year dollar figure. Those change
 *    annually and a stale number on an approved page is a real problem. Where
 *    one is genuinely needed it is marked with a TODO and left out.
 * 3. Language stays hedged, "may", "varies by plan", "options that may fit".
 *    Avoid "free", "best", superlatives, and anything implying every available
 *    plan is offered. The footer disclaimer already states that it is not.
 * 4. Each page may need its own CMS material ID rather than inheriting the
 *    site wide SMID. TODO confirm with the client's compliance contact and add
 *    a per product smid field here once answered.
 */

export const PRODUCTS = {
  'medicare-advantage': {
    slug: 'medicare-advantage',
    name: 'Medicare Advantage',
    eyebrow: 'Medicare Part C',
    title: 'Medicare Advantage Plans | iHealth Plans',
    metaDescription:
      'Medicare Advantage plans bundle Part A, Part B, and usually Part D in one plan. Speak with a licensed insurance agent about options that may fit your needs.',
    headline: 'Medicare Advantage Plans',
    intro:
      'Medicare Advantage, sometimes called Part C, is offered by private insurance companies that contract with Medicare. These plans bundle your Part A and Part B coverage into a single plan, and most include prescription drug coverage as well.',

    whatItIs: {
      heading: 'How Medicare Advantage works',
      body: [
        'When you enroll in a Medicare Advantage plan you stay in the Medicare program, but your coverage is administered by the private company offering the plan rather than by Original Medicare.',
        'Plans are offered by service area, so the options available to you depend on where you live. Most plans use a provider network, and some require you to choose a primary care provider or get a referral before seeing a specialist.',
      ],
    },

    keyPoints: [
      {
        title: 'Hospital and medical coverage in one plan',
        body: 'Part A and Part B benefits are combined into a single plan with a single card, rather than managed separately.',
      },
      {
        title: 'Prescription drug coverage is usually included',
        body: 'Most Medicare Advantage plans include Part D coverage. Plans that do are often called MA-PD plans.',
      },
      {
        title: 'Benefits Original Medicare does not cover',
        body: 'Many plans offer additional benefits such as dental, vision, hearing, or fitness. What is offered varies by plan and by area.',
      },
      {
        title: 'A yearly limit on what you pay',
        body: 'Medicare Advantage plans have an annual out of pocket maximum for covered services. Original Medicare does not have one.',
      },
    ],

    planTypes: {
      heading: 'Types of Medicare Advantage plans',
      items: [
        { term: 'HMO', detail: 'Generally requires you to use providers in the plan network, and often requires a referral to see a specialist.' },
        { term: 'PPO', detail: 'Lets you see providers outside the network, usually at a higher cost to you.' },
        { term: 'PFFS', detail: 'Sets its own payment terms with providers. Not every provider will accept the plan.' },
        { term: 'SNP', detail: 'Special Needs Plans, limited to people with a specific condition or circumstance, including people who also have Medicaid.' },
      ],
    },

    costs: {
      heading: 'What you may pay',
      items: [
        { term: 'Your Part B premium', detail: 'You continue to pay your Medicare Part B premium when you are enrolled in a Medicare Advantage plan.' },
        { term: 'A plan premium', detail: 'Some plans charge a monthly premium in addition to your Part B premium. Some do not. This varies by plan and by area.' },
        { term: 'Copays and coinsurance', detail: 'You may pay a set amount or a percentage when you receive care, depending on the service and the plan.' },
        { term: 'A deductible', detail: 'Some plans have a deductible you pay before the plan begins paying its share.' },
      ],
    },

    eligibility: {
      heading: 'Who can enroll',
      items: [
        'You are enrolled in both Medicare Part A and Part B.',
        'You live in the plan’s service area.',
        'You enroll during a period when you are eligible to make a change.',
      ],
    },

    faqs: [
      {
        question: 'Do I keep Original Medicare if I join a Medicare Advantage plan?',
        answer:
          'You remain in the Medicare program, but your Part A and Part B benefits are provided through the Medicare Advantage plan rather than directly through Original Medicare. You continue to pay your Part B premium.',
      },
      {
        question: 'Can I keep my current doctor?',
        answer:
          'It depends on the plan. Most Medicare Advantage plans use a provider network, so whether a particular doctor is covered depends on whether they participate in that plan. A licensed insurance agent can help you check before you enroll.',
      },
      {
        question: 'Do I need a separate prescription drug plan?',
        answer:
          'Usually not. Most Medicare Advantage plans include Part D prescription drug coverage. Some do not, and in that case a separate plan may be an option depending on the type of plan you choose.',
      },
      {
        question: 'What is the annual out of pocket maximum?',
        answer:
          'It is a yearly limit on what you pay for covered services under the plan. Once you reach it, the plan pays the full cost of covered services for the rest of the year. The amount varies by plan.',
      },
    ],

    related: ['medicare-supplement', 'prescription-drug-plans', 'dual-eligible-snp'],
  },

  'medicare-supplement': {
    slug: 'medicare-supplement',
    name: 'Medicare Supplement',
    eyebrow: 'Medigap',
    title: 'Medicare Supplement Plans | iHealth Plans',
    metaDescription:
      'Medicare Supplement, or Medigap, works alongside Original Medicare to help pay costs it leaves behind. Speak with a licensed insurance agent about your options.',
    headline: 'Medicare Supplement Plans',
    intro:
      'Medicare Supplement insurance, often called Medigap, is sold by private insurance companies to work alongside Original Medicare. It helps pay some of the costs Original Medicare does not, such as coinsurance, copayments, and deductibles.',

    whatItIs: {
      heading: 'How Medicare Supplement works',
      body: [
        'A Medigap policy does not replace Original Medicare. You keep Part A and Part B, Medicare pays its share of a covered service first, and then your Medigap policy pays its share.',
        'Medigap policies are standardized and identified by letter. A plan with a given letter offers the same basic benefits no matter which company sells it, so the differences between carriers are price, service, and availability rather than coverage.',
      ],
    },

    keyPoints: [
      {
        title: 'No provider network',
        body: 'You can generally see any provider anywhere in the country who accepts Medicare, without a referral.',
      },
      {
        title: 'Standardized benefits',
        body: 'Plans are labelled by letter. The same letter means the same basic benefits regardless of which company you buy it from.',
      },
      {
        title: 'Prescription drugs are not included',
        body: 'Medigap policies do not include drug coverage. A separate Part D plan is usually needed if you want prescription coverage.',
      },
      {
        title: 'Coverage renews as long as you pay',
        body: 'Medigap policies are generally guaranteed renewable, meaning the policy continues as long as premiums are paid.',
      },
    ],

    planTypes: {
      heading: 'Things to know about plan letters',
      items: [
        { term: 'Standardized letters', detail: 'Most states use the same set of standardized plans, identified by letters such as A, B, D, G, K, L, M, and N.' },
        { term: 'Plans C and F', detail: 'These are not available to people who became newly eligible for Medicare on or after 1 January 2020. People already eligible before then may still be able to keep or buy them.' },
        { term: 'Some states differ', detail: 'Massachusetts, Minnesota, and Wisconsin standardize their plans differently from the rest of the country.' },
        { term: 'One policy per person', detail: 'A Medigap policy covers one person. A spouse or partner needs their own policy.' },
      ],
    },

    costs: {
      heading: 'What you may pay',
      items: [
        { term: 'Your Part B premium', detail: 'You continue to pay your Medicare Part B premium.' },
        { term: 'A Medigap premium', detail: 'You pay a separate monthly premium to the insurance company for the Medigap policy itself.' },
        { term: 'A Part D premium', detail: 'If you add prescription drug coverage, that is a separate plan with its own premium.' },
        { term: 'Remaining costs', detail: 'What you still pay out of pocket depends on which plan letter you choose, since the letters differ in how much they cover.' },
      ],
    },

    eligibility: {
      heading: 'When you can buy a Medigap policy',
      items: [
        'Your Medigap Open Enrollment Period lasts 6 months and begins the month you are both 65 or older and enrolled in Part B.',
        'During that period you can buy any Medigap policy sold in your state, and health problems cannot be used to refuse you or charge you more.',
        'Outside that period, an insurance company may be allowed to use medical underwriting, which can affect whether you can buy a policy and what you pay.',
        'Some situations create a guaranteed issue right outside the open enrollment period. A licensed insurance agent can help you understand whether one applies to you.',
      ],
    },

    faqs: [
      {
        question: 'Can I have both a Medigap policy and a Medicare Advantage plan?',
        answer:
          'No. Medigap works alongside Original Medicare, so it cannot be used with a Medicare Advantage plan. If you are enrolled in a Medicare Advantage plan, a Medigap policy cannot pay your costs under it.',
      },
      {
        question: 'Why is the Medigap Open Enrollment Period so important?',
        answer:
          'It is the one window when you can buy any Medigap policy sold in your state regardless of your health. It lasts 6 months, it starts when you are 65 or older and enrolled in Part B, and it does not repeat.',
      },
      {
        question: 'Do all companies charge the same price for the same plan letter?',
        answer:
          'No. Benefits for a given letter are standardized, but each insurance company sets its own price and may use a different pricing method. Comparing prices for the same letter is worthwhile.',
      },
      {
        question: 'Does Medigap cover prescription drugs?',
        answer:
          'No. Medigap policies sold today do not include prescription drug coverage. Drug coverage is available separately through a Part D plan.',
      },
    ],

    related: ['medicare-advantage', 'prescription-drug-plans', 'dual-eligible-snp'],
  },

  'prescription-drug-plans': {
    slug: 'prescription-drug-plans',
    name: 'Prescription Drug Plans',
    eyebrow: 'Medicare Part D',
    title: 'Medicare Prescription Drug Plans | iHealth Plans',
    metaDescription:
      'Medicare Part D helps cover prescription drug costs. Compare standalone plans and plans built into Medicare Advantage with a licensed insurance agent.',
    headline: 'Prescription Drug Plans',
    intro:
      'Medicare Part D helps cover the cost of prescription drugs. It is offered by private insurance companies approved by Medicare, either as a standalone plan or built into a Medicare Advantage plan.',

    whatItIs: {
      heading: 'Two ways to get Part D coverage',
      body: [
        'A standalone Prescription Drug Plan, sometimes called a PDP, is added alongside Original Medicare or a Medicare Supplement policy.',
        'Alternatively, most Medicare Advantage plans already include prescription drug coverage. Those are often called MA-PD plans, and in that case a separate Part D plan is generally not needed.',
      ],
    },

    keyPoints: [
      {
        title: 'Every plan has its own drug list',
        body: 'The list of covered drugs is called a formulary, and it is organized into tiers. Two plans can cover the same drug at very different costs.',
      },
      {
        title: 'Pharmacy choice affects price',
        body: 'Plans often have preferred and standard pharmacies, and the same prescription can cost a different amount depending on which you use.',
      },
      {
        title: 'A yearly cap on what you pay',
        body: 'Part D includes an annual limit on what you pay out of pocket for covered drugs. Once you reach it, you pay nothing more for covered drugs that year.',
      },
      {
        title: 'Help may be available',
        body: 'People with limited income and resources may qualify for the Extra Help program, which assists with Part D costs.',
      },
    ],

    planTypes: {
      heading: 'How costs are structured',
      items: [
        { term: 'Monthly premium', detail: 'What you pay for the plan itself. This varies by plan and by area.' },
        { term: 'Annual deductible', detail: 'An amount you may pay before the plan starts paying its share. Not every plan has one.' },
        { term: 'Copays and coinsurance', detail: 'What you pay for each prescription, which depends on the drug’s tier and the pharmacy you use.' },
        { term: 'Out of pocket limit', detail: 'A yearly cap on your covered drug costs, after which the plan covers them in full for the rest of the year.' },
      ],
    },

    costs: {
      heading: 'The late enrollment penalty',
      items: [
        {
          term: 'What triggers it',
          detail:
            'Going 63 days or more in a row without Part D or other creditable prescription drug coverage after your Initial Enrollment Period ends.',
        },
        {
          term: 'How long it lasts',
          detail:
            'The penalty is added to your monthly Part D premium and generally continues for as long as you have Part D coverage.',
        },
        {
          term: 'Creditable coverage',
          detail:
            'Drug coverage from an employer, a union, or certain other sources may count as creditable, which avoids the penalty. Your plan should tell you each year whether yours does.',
        },
        {
          term: 'Why it matters',
          detail:
            'People who take no prescriptions at 65 often skip Part D and are surprised later. Enrolling when first eligible avoids the penalty even if you use little coverage at first.',
        },
      ],
    },

    eligibility: {
      heading: 'Who can enroll',
      items: [
        'You are entitled to Medicare Part A or enrolled in Part B.',
        'You live in the plan’s service area.',
        'You enroll during a period when you are eligible to join or change a plan.',
      ],
    },

    faqs: [
      {
        question: 'What if my prescription is not on the plan’s formulary?',
        answer:
          'Coverage depends on the plan. You may be able to request an exception, ask your prescriber about a covered alternative, or choose a different plan when you are next able to make a change. Checking your prescriptions against a plan’s formulary before enrolling is worthwhile.',
      },
      {
        question: 'Can I change my Part D plan?',
        answer:
          'Generally yes, during the Annual Enrollment Period each autumn, or during a Special Enrollment Period if one applies to you. Formularies and costs change each year, so reviewing your plan annually is a good habit.',
      },
      {
        question: 'Do I need Part D if I take no prescriptions?',
        answer:
          'It is worth considering. Going without creditable drug coverage after your Initial Enrollment Period can result in a late enrollment penalty that is added to your premium for as long as you have Part D.',
      },
      {
        question: 'Is Part D included with a Medicare Advantage plan?',
        answer:
          'Most Medicare Advantage plans include it. Some do not. If yours does, a separate standalone Part D plan is generally not needed.',
      },
    ],

    related: ['medicare-advantage', 'medicare-supplement', 'dual-eligible-snp'],
  },

  'dual-eligible-snp': {
    slug: 'dual-eligible-snp',
    name: 'Dual Eligible Special Needs Plans',
    eyebrow: 'D-SNP',
    title: 'Dual Eligible Special Needs Plans (D-SNP) | iHealth Plans',
    metaDescription:
      'D-SNP plans are for people who have both Medicare and Medicaid. Speak with a licensed insurance agent about coordinating both types of coverage.',
    headline: 'Dual Eligible Special Needs Plans',
    intro:
      'A Dual Eligible Special Needs Plan, or D-SNP, is a type of Medicare Advantage plan for people who have both Medicare and Medicaid. It is designed to coordinate the two programs in a single plan.',

    whatItIs: {
      heading: 'How a D-SNP works',
      body: [
        'D-SNPs are a form of Special Needs Plan, which is a Medicare Advantage plan limited to people in a particular situation. In this case, that situation is being eligible for both Medicare and Medicaid.',
        'Because the plan works with both programs, it can coordinate benefits that would otherwise be managed separately. Most D-SNPs also include Part D prescription drug coverage.',
      ],
    },

    keyPoints: [
      {
        title: 'Both programs in one plan',
        body: 'Medicare and Medicaid benefits are coordinated through a single plan rather than managed independently.',
      },
      {
        title: 'Prescription drug coverage is usually included',
        body: 'Most D-SNPs include Part D, so a separate prescription drug plan is generally not needed.',
      },
      {
        title: 'Care coordination',
        body: 'Many D-SNPs offer care coordination to help members navigate providers, services, and benefits across both programs.',
      },
      {
        title: 'Additional benefits may be offered',
        body: 'Plans may include benefits beyond Original Medicare. What is offered varies by plan and by area.',
      },
    ],

    planTypes: {
      heading: 'What affects your costs',
      items: [
        {
          term: 'Your level of Medicaid eligibility',
          detail:
            'Medicaid eligibility comes in categories, and which one applies to you affects what you pay for Medicare costs such as premiums, deductibles, and coinsurance.',
        },
        {
          term: 'The plan you choose',
          detail: 'Costs and benefits vary between D-SNPs, and which plans are available depends on where you live.',
        },
        {
          term: 'State Medicaid rules',
          detail: 'Medicaid is administered by each state, so what it covers and who qualifies differs depending on where you live.',
        },
        {
          term: 'Talking it through',
          detail:
            'Because eligibility categories drive so much of the cost, this is worth reviewing with a licensed insurance agent rather than estimating.',
        },
      ],
    },

    costs: {
      heading: 'What you may pay',
      items: [
        { term: 'Your Part B premium', detail: 'Depending on your Medicaid eligibility category, your state may pay some or all of your Part B premium.' },
        { term: 'Plan costs', detail: 'What you pay for covered services depends on the plan and on your level of Medicaid eligibility.' },
        { term: 'Prescription costs', detail: 'People with both Medicare and Medicaid generally qualify for Extra Help with Part D costs.' },
      ],
    },

    eligibility: {
      heading: 'Who can enroll',
      items: [
        'You are entitled to Medicare Part A and enrolled in Part B.',
        'You are eligible for Medicaid in your state.',
        'You live in the plan’s service area.',
        'People who have both Medicare and Medicaid may have more frequent opportunities to enrol in or change plans than other people do.',
      ],
    },

    faqs: [
      {
        question: 'How do I know whether I qualify for Medicaid?',
        answer:
          'Medicaid is run by each state and eligibility rules differ. Your state Medicaid office can confirm your status, and a licensed insurance agent can help you understand how it affects your Medicare options.',
      },
      {
        question: 'Is a D-SNP the same as a Medicare Advantage plan?',
        answer:
          'A D-SNP is a type of Medicare Advantage plan. What makes it different is that enrolment is limited to people who have both Medicare and Medicaid, and the plan is built to coordinate the two.',
      },
      {
        question: 'Do I keep my Medicaid benefits if I join a D-SNP?',
        answer:
          'Yes. A D-SNP does not replace Medicaid. It coordinates with it, and your Medicaid benefits continue according to your state’s rules.',
      },
      {
        question: 'Can I change plans more often if I have both Medicare and Medicaid?',
        answer:
          'People who are dually eligible often have access to Special Enrollment Periods that let them make changes outside the Annual Enrollment Period. How often depends on your circumstances.',
      },
    ],

    related: ['medicare-advantage', 'medicare-supplement', 'prescription-drug-plans'],
  },
}

// Enrollment windows are the same across products and the dates are stable
// year to year, unlike dollar figures, so they are safe to state directly.
export const ENROLLMENT_WINDOWS = [
  {
    name: 'Initial Enrollment Period',
    dates: '7 months around your 65th birthday',
    detail:
      'Begins 3 months before the month you turn 65, includes that month, and ends 3 months after. This is when most people first enrol.',
  },
  {
    name: 'Annual Enrollment Period',
    dates: '15 October to 7 December',
    detail:
      'Each autumn you can join, switch, or drop a Medicare Advantage or Part D plan. Changes generally take effect on 1 January.',
  },
  {
    name: 'Medicare Advantage Open Enrollment',
    dates: '1 January to 31 March',
    detail:
      'If you are already in a Medicare Advantage plan you can switch to another one, or return to Original Medicare, once during this window.',
  },
  {
    name: 'Special Enrollment Period',
    dates: 'When your circumstances change',
    detail:
      'Events such as moving, losing other coverage, or qualifying for Medicaid can open a window to make a change outside the usual periods.',
  },
]

/**
 * Looks up one product by slug.
 * Returns null rather than throwing so a route can decide between a fallback
 * and a 404.
 */
export function getProduct(slug) {
  return PRODUCTS[slug] || null
}

/**
 * All 4 products, in the order they should appear in navigation.
 * Object key order is the source of truth, which keeps the nav and the page
 * data from drifting apart.
 */
export function getAllProducts() {
  return Object.values(PRODUCTS)
}
