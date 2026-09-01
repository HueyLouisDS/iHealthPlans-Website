// What the site pulls out of TLD, and how each field maps onto migration 002.
// One entry per table. Ordered, because calls reference agents and
// dispositions and a call arriving first would have nothing to point at.

/*=======================================================
        PATHS CONFIRMED, FIELD NAMES STILL UNCONFIRMED
========================================================*/

/*
 Paths checked against /api/egress/endpoints and
 /api/egress/tldialer/endpoints on the live api. There are 2 families under
 one base url and one credential, the CRM at /api/egress/ and the dialer at
 /api/egress/tldialer/.

 Field names are still guesses. Every endpoint answers {path}/docs with its
 real column list, so each map below can be settled without asking anybody.

 Filtering is TQL. There is no generic date_start parameter. Each column
 generates its own keys, so a modified-since filter is the column name with a
 comparison suffix, date_created_greater_equal rather than date_start. The
 suffix set is confirmed from tags/docs, the column names per endpoint are not.
*/
const VICIDIAL_OPTION = { vicidial: 1 }

export const RESOURCES = [
  {
    name: 'dispositions',
    /*
     Dialer side, not CRM. There is no /api/egress/statuses at all, which is
     what the original guess asked for.

     vicidial_statuses is the raw table and carries the fields this map wants.
     join_statuses also exists and may already resolve the category, so check
     both with /docs before settling. vicidial_status_categories and
     vicidial_status_groups are the lookups behind it.
    */
    path: '/api/egress/tldialer/vicidial_statuses',
    table: 'dispositions',
    key: 'disposition_code',
    incremental: false,
    map: {
      disposition_code: 'status',
      label: 'status_name',
      category: 'category',
      counts_as_conversion: 'sale',
      is_dnc: 'dnc',
      sort_order: 'sort_order',
    },
  },
  {
    name: 'agents',
    path: '/api/egress/users',
    table: 'agents',
    key: 'agent_id',
    incremental: false,

    /*-------- This is critical --------*/
    /*
     Never pull this endpoint without naming columns. The users table carries
     cms_password, healthsherpa_password, cms_username, healthsherpa_username,
     personal_address, personal_email and personal_phone, confirmed from the
     column list returned by /docs/column.

     A default pull mirrors agent credentials and home addresses into our
     database, where nothing needs them, nothing reads them, and the retention
     purge does not know to strip them. The 6 columns below are the whole of
     what the reporting layer uses.

     TODO send these as the columns parameter once the selector syntax is
     confirmed. Until then this map is the only thing keeping the rest out,
     and it filters after the payload has already crossed the wire.
    */
    columns: ['user_id', 'vicidial_user', 'full_name', 'email', 'npn', 'status_id'],

    map: {
      agent_id: 'user_id',
      // Confirmed. There is no plain `user` column, the dialer login is this
      dialer_user: 'vicidial_user',
      // Both name and full_name exist. full_name is the assembled one
      full_name: 'full_name',
      email: 'email',
      npn: 'npn',
      /*
       TODO there is no `active` column. The table has status_id, plus
       date_activated and date_deactivated. Confirm which status_id means
       active before mapping, since guessing here silently hides agents from
       /admin/agents or shows leavers as current staff.
      */
      is_active: 'status_id',
    },
  },
  {
    name: 'dialer_leads',
    path: '/api/egress/leads',
    table: 'dialer_leads',
    key: 'tld_lead_id',
    incremental: true,
    cursorColumn: 'created_at',
    cursorParam: 'date_start',
    // The leads endpoint refuses a request with no range, unlike the others
    requiresRange: true,
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
      lead_id: 'tracking_id',
    },
  },
  {
    name: 'calls',
    /*
     TODO not settled. There is no /api/egress/calls, which is what the
     original guess asked for, and the dialer side offers 4 candidates:

       call_log            the likely one, reads as the unified log
       agency_call_log     possibly scoped to the agency rather than a user
       tldialer_call_log   possibly the raw table behind call_log
       user_call_log       almost certainly per agent, too narrow

     Underneath those, vicidial_log holds outbound and vicidial_closer_log
     holds inbound and transfers. This site needs both directions in one
     resource, so a merged log is preferred over stitching those two.

     Compare with /docs on each before settling.
    */
    path: '/api/egress/tldialer/call_log',
    table: 'calls',
    key: 'call_id',
    incremental: true,
    cursorColumn: 'started_at',
    cursorParam: 'date_start',
    params: VICIDIAL_OPTION,
    // Smaller pages, the rows are wide once the vicidial columns are on
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
      // The attribution join. Without this the whole chain is guesswork.
      did_number: 'did',
      campaign: 'campaign_id',
      ingroup: 'ingroup',
      disposition_code: 'status',
      recording_url: 'recording_url',
    },
  },
  {
    name: 'policies',
    path: '/api/egress/policies',
    table: 'policies',
    key: 'policy_id',
    incremental: true,
    cursorColumn: 'synced_at',
    cursorParam: 'date_modified_start',
    // Rows that stop coming back get stamped rather than deleted 
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

export function resourceByName(name) {
  return RESOURCES.find((resource) => resource.name === name) || null
}

export const DATE_COLUMNS = new Set([
  'created_at',
  'started_at',
  'answered_at',
  'ended_at',
  'submitted_at',
  'disenrolled_at',
  'effective_date',
])

// Columns stored as 0 or 1 rather than whatever TLD sends
export const BOOLEAN_COLUMNS = new Set(['is_dnc', 'is_active', 'counts_as_conversion'])
