// What the site pulls out of TLD, and how each field maps onto migration 002.
// One entry per table. Ordered, because calls reference agents and
// dispositions and a call arriving first would have nothing to point at.

/*=======================================================
        EVERY PATH AND FIELD NAME BELOW IS UNCONFIRMED
========================================================*/

/*
 These were written against the schema rather than against a live response,
 because there were no credentials when this was built. They are the shape
 the sync needs, not proof of what TLD returns.

 Run `node scripts/sync.mjs --inspect` once the api key is in. It fetches one
 page of each resource and prints the field names it actually got beside the
 ones this file expects, which turns the whole thing into a list of edits
 rather than a debugging session.

 Nothing writes to the database until the maps are confirmed. --inspect is
 read only.

 The VICIdial options. TLD exposes the dialer's own columns as an option on
 each endpoint rather than as a separate api, and the granular call data
 lives there rather than in the standard field set.

 calls needs it. did_number in particular is the attribution join, the field
 that matches call_clicks.presented_number, and a summarised call record is
 unlikely to carry the number the caller actually dialed.

 TODO confirm the parameter name. `vicidial` is a guess.
*/
const VICIDIAL_OPTION = { vicidial: 1 }

export const RESOURCES = [
  /*
   Dispositions. Small, no cursor, replaced whole every run.
   -----------------------------------------------------------------------*/
   {
   name: 'dispositions',
   path: '/api/egress/statuses',
   table: 'dispositions',
   key: 'disposition_code',
   incremental: false,
   tag: 'db:calls',
   map: {
   disposition_code: 'status',
   label: 'status_name',
   category: 'category',
   counts_as_conversion: 'sale',
   is_dnc: 'dnc',
   sort_order: 'sort_order',
   },
   },

   /*-----------------------------------------------------------------------
   Agents. Also small and also replaced whole.
   -----------------------------------------------------------------------*/
   {
   name: 'agents',
   path: '/api/egress/users',
   table: 'agents',
   key: 'agent_id',
   incremental: false,
   tag: 'db:agents',
   map: {
   agent_id: 'user_id',
   dialer_user: 'user',
   full_name: 'name',
   email: 'email',
   npn: 'npn',
   is_active: 'active',
   },
   },

   /*-----------------------------------------------------------------------
   Leads that exist only in the dialer. Needs a date range.
   -----------------------------------------------------------------------*/
   {
   name: 'dialer_leads',
   path: '/api/egress/leads',
   table: 'dialer_leads',
   key: 'tld_lead_id',
   incremental: true,
   cursorColumn: 'created_at',
   cursorParam: 'date_start',
   /* The leads endpoint refuses a request with no range, unlike the others */
   requiresRange: true,
   tag: 'db:leads',
   map: {
   tld_lead_id: 'lead_id',
   created_at: 'date_created',
   phone: 'phone',
   first_name: 'first_name',
   last_name: 'last_name',
   email: 'email',
   state: 'state',
   zip: 'zipcode',
   dialer_source: 'vendor_name',
   dialer_list_id: 'list_id',
   dialer_status: 'status',
   is_dnc: 'dnc',
   /*
   Our own lead id, sent as tracking_id on the way in. This is what backs
   the join, and it is why the push mints an id before storing rather
   than relying on anything TLD returns.
  */
      lead_id: 'tracking_id',
    },
  },

  /*
   Calls. The big one, and the one the attribution depends on.
   -----------------------------------------------------------------------*/
   {
   name: 'calls',
   path: '/api/egress/calls',
   table: 'calls',
   key: 'call_id',
   incremental: true,
   cursorColumn: 'started_at',
   cursorParam: 'date_start',
   params: VICIDIAL_OPTION,
   tag: 'db:calls',
   /* Smaller pages, the rows are wide once the vicidial columns are on */
   pageSize: 2000,
   map: {
   call_id: 'call_id',
   tld_lead_id: 'lead_id',
   agent_id: 'user_id',
   direction: 'direction',
   started_at: 'date_started',
   answered_at: 'date_answered',
   ended_at: 'date_ended',
   queue_seconds: 'queue_seconds',
   talk_seconds: 'talk_seconds',
   wrap_seconds: 'wrap_seconds',
   customer_number: 'phone',
   /* The attribution join. Without this the whole chain is guesswork. */
   did_number: 'did',
   campaign: 'campaign_id',
   ingroup: 'ingroup',
   disposition_code: 'status',
   recording_url: 'recording_url',
   },
   },

   /*-----------------------------------------------------------------------
   Policies. Cursor on modified, not created, because a status change after
   submission is the entire reason to re-read a policy.
   -----------------------------------------------------------------------*/
   {
   name: 'policies',
   path: '/api/egress/policies',
   table: 'policies',
   key: 'policy_id',
   incremental: true,
   cursorColumn: 'synced_at',
   cursorParam: 'date_modified_start',
   tag: 'db:policies',
   /* Rows that stop coming back get stamped rather than deleted */
   tracksMissing: true,
   map: {
   policy_id: 'policy_id',
   tld_lead_id: 'lead_id',
   agent_id: 'agent_id',
   carrier: 'carrier_name',
   plan_name: 'product_name',
   plan_type: 'plan_type',
   contract_id: 'contract_id',
   plan_id: 'pbp',
   segment_id: 'segment_id',
   policy_status: 'status_name',
   submitted_at: 'date_sold',
   effective_date: 'date_effective',
   disenrolled_at: 'date_cancelled',
   premium: 'premium',
   },
   },
   ]

   /**
   Looks up one resource by name, for a targeted re-sync.
  */
export function resourceByName(name) {
  return RESOURCES.find((resource) => resource.name === name) || null
}

/*
 Columns that hold a timestamp, so the mapper knows to reformat them.
 Listed rather than sniffed from the value, because a sniff would have to
 guess and a date that silently fails to parse becomes a null in a column the
 reporting sorts by.
*/
export const DATE_COLUMNS = new Set([
  'created_at',
  'started_at',
  'answered_at',
  'ended_at',
  'submitted_at',
  'disenrolled_at',
  'effective_date',
])

/* Columns stored as 0 or 1 rather than whatever TLD sends */
export const BOOLEAN_COLUMNS = new Set(['is_dnc', 'is_active', 'counts_as_conversion'])
