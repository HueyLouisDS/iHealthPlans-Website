/*
 * 002 The dialer half of the identity chain, mirrored from TLD.
 *
 * 001 built everything the site originates itself:
 *   visitor -> session -> call_click -> lead
 *
 * This one builds what happens after the phone rings, and it is the half that
 * turns the chain into an answer:
 *   call_click -> call -> agent -> policy
 *
 * Every table here is a MIRROR. TLD is the system of record for all of it.
 * Nothing in this file is ever the authority on its own contents, and nothing
 * in this file should ever be edited by the website.
 *
 * Every timestamp is UTC. The driver is configured with timezone Z and
 * dateStrings, so nothing here is ever parsed in a local timezone.
 */

/*=======================================================
        MIRROR TABLES CARRY NO FOREIGN KEYS TO EACH OTHER
========================================================*/

/*
 * 001 uses foreign keys freely, because it owns both sides of every one of
 * them and controls the order they are written in. This file does not.
 *
 * A call can arrive referencing an agent hired an hour ago, or a disposition
 * code somebody added in the TLD admin this morning. With a foreign key that
 * one row fails, the transaction rolls back, and the entire nightly sync dies
 * over a label nobody has looked at.
 *
 * An unknown code should surface as an unknown row on the dashboard, where
 * somebody notices it and adds it. It should not be able to stop the sync.
 *
 * The only foreign keys below point at tables 001 owns, and only on columns
 * our own matcher fills in after the fact.
 */

-- ---------------------------------------------------------------------------
-- Dispositions
-- ---------------------------------------------------------------------------

/*
 * The outcome codes configured in the dialer. A lookup rather than a string on
 * every call row, because these are the client's own custom statuses and the
 * set changes without warning.
 */
CREATE TABLE dispositions (
  disposition_code VARCHAR(40)   NOT NULL,
  label            VARCHAR(120)  NULL,

  /*
   * Broad bucket the dashboard groups by: sale, contact, no_contact, dropped,
   * callback, other. Held here rather than inferred from the code, because
   * every dialer names these differently and a guess in the reporting layer is
   * how a sale ends up counted as a no answer.
   */
  category         VARCHAR(20)   NOT NULL DEFAULT 'other',

  /*
   * Whether a call ending on this code counts toward the conversion numbers on
   * /admin/agents and /admin/attribution. Explicit, and explicitly separate
   * from category, because a transfer to a licensed agent is a conversion for
   * the marketing and is not a sale in the dialer.
   */
  counts_as_conversion TINYINT(1) NOT NULL DEFAULT 0,

  /*
   * Do-not-call is NOT a disposition, it is a flag on the record, and the two
   * are orthogonal. A person can be dispositioned not interested without being
   * DNC, and a person can be DNC on a call that connected and went well.
   * Conflating them either suppresses contactable leads or, far worse, keeps
   * dialing somebody who asked not to be.
   */
  is_dnc           TINYINT(1)    NOT NULL DEFAULT 0,

  sort_order       INT           NOT NULL DEFAULT 0,
  synced_at        DATETIME(3)   NOT NULL,

  PRIMARY KEY (disposition_code),
  KEY idx_dispositions_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Agents
-- ---------------------------------------------------------------------------

CREATE TABLE agents (
  /*
   * TLD's own identifier, kept as the primary key so a re-sync upserts rather
   * than duplicating. Never generate one of these locally.
   */
  agent_id        VARCHAR(64)   NOT NULL,

  /*
   * The VICIdial login. Distinct from agent_id, and it is the value that shows
   * up in raw call logs, so both are needed to reconcile anything by hand.
   */
  dialer_user     VARCHAR(60)   NULL,

  full_name       VARCHAR(120)  NULL,
  email           VARCHAR(255)  NULL,

  /*
   * National Producer Number. Not decoration. A TPMO has to be able to say
   * which licensed agent handled a given enrollment, and the NPN is how that
   * is asked for at audit.
   */
  npn             VARCHAR(20)   NULL,

  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  first_seen_at   DATETIME(3)   NOT NULL,
  synced_at       DATETIME(3)   NOT NULL,

  PRIMARY KEY (agent_id),
  UNIQUE KEY uq_agents_dialer_user (dialer_user),
  KEY idx_agents_active (is_active, full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Leads that exist only in the dialer
-- ---------------------------------------------------------------------------

/*=======================================================
        WHY THIS IS NOT JUST MORE ROWS IN leads
========================================================*/

/*
 * The obvious move is to widen the leads table from 001 with an origin of
 * 'tld'. It is the wrong move, and the reason is consent.
 *
 * /api/leads/inbound refuses any lead that arrives without the evidence, so
 * every vendor lead in that table has a matching row in lead_consents. The
 * route enforces it, not the schema. The foreign key runs from lead_consents
 * to leads, so it only guarantees a consent points at a real lead, not that
 * every lead has one.
 *
 * Leads created inside the dialer, bought lists, agent entered records, list
 * imports, did not come through that gate. Mixing them into leads means the
 * guarantee is no longer true of the table, and a guarantee that is true of
 * most rows is not a guarantee.
 *
 * So they live here, separately, and every report that says leads has to
 * decide on purpose which of the two it means.
 *
 * This table carries real beneficiary PII. It inherits the same access
 * controls as leads, and any export of it goes through audit_log.
 */
CREATE TABLE dialer_leads (
  tld_lead_id     VARCHAR(64)   NOT NULL,

  /*
   * Set by our own matcher when a dialer lead turns out to be one the site
   * originated. Null is the normal state, not an error.
   */
  lead_id         CHAR(36)      NULL,

  created_at      DATETIME(3)   NULL,
  phone           VARCHAR(20)   NOT NULL,
  first_name      VARCHAR(120)  NULL,
  last_name       VARCHAR(120)  NULL,
  email           VARCHAR(255)  NULL,
  state           CHAR(2)       NULL,
  zip             CHAR(5)       NULL,

  /*
   * TLD's own source or vendor label. Deliberately kept raw and unmapped. The
   * attribution layer decides what it means, and the day somebody renames a
   * list in TLD we want to see the new name rather than silently absorb it
   * into an existing bucket.
   */
  dialer_source   VARCHAR(120)  NULL,
  dialer_list_id  VARCHAR(64)   NULL,
  dialer_status   VARCHAR(40)   NULL,

  /*
   * The record level do-not-call flag, mirrored from TLD. Separate from any
   * call disposition, for the reason spelled out on the dispositions table.
   */
  is_dnc          TINYINT(1)    NOT NULL DEFAULT 0,

  synced_at       DATETIME(3)   NOT NULL,

  PRIMARY KEY (tld_lead_id),
  KEY idx_dialer_leads_phone (phone),
  KEY idx_dialer_leads_created (created_at),
  KEY idx_dialer_leads_our_lead (lead_id),
  CONSTRAINT fk_dialer_leads_lead FOREIGN KEY (lead_id)
    REFERENCES leads (lead_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Calls
-- ---------------------------------------------------------------------------

/*=======================================================
        did_number IS THE ATTRIBUTION JOIN. GUARD IT.
========================================================*/

/*
 * call_clicks.presented_number records the number the website showed somebody.
 * calls.did_number records the number that actually rang. Those two matching,
 * inside a short window, is the entire mechanism by which a marketing source
 * gets credit for an enrollment.
 *
 * Right now there is one number, so the match is time based and weak. The
 * moment tracking numbers are pooled it becomes exact. Both columns already
 * exist and are already indexed so that switch is a change to the matcher and
 * nothing else.
 *
 * Store did_number in the same normalised form as presented_number, or the
 * join silently returns nothing and the dashboard reports an attribution rate
 * of zero with no error anywhere.
 */
CREATE TABLE calls (
  /*
   * VARCHAR(64) to match call_clicks.matched_call_id exactly. A width mismatch
   * across a join column is a full scan that nobody notices until AEP.
   */
  call_id         VARCHAR(64)   NOT NULL,

  tld_lead_id     VARCHAR(64)   NULL,

  /*
   * Filled by our matcher, not by the sync. Null means this call has not been
   * tied to a website session, which is the number that says whether any of
   * the tracking is actually working.
   */
  lead_id         CHAR(36)      NULL,

  agent_id        VARCHAR(64)   NULL,

  direction       VARCHAR(10)   NOT NULL DEFAULT 'inbound',

  started_at      DATETIME(3)   NOT NULL,
  answered_at     DATETIME(3)   NULL,
  ended_at        DATETIME(3)   NULL,

  /*
   * Three separate durations, because they answer three different questions.
   * queue is a marketing problem, talk is a sales one, wrap is a staffing one.
   * A single duration column collapses all three, and /admin/agents needs talk
   * alone or the ranking rewards whoever sat on hold longest.
   */
  queue_seconds   INT           NULL,
  talk_seconds    INT           NULL,
  wrap_seconds    INT           NULL,

  -- The beneficiary's number, and the number they dialed.
  customer_number VARCHAR(20)   NULL,
  did_number      VARCHAR(20)   NULL,

  campaign        VARCHAR(120)  NULL,
  ingroup         VARCHAR(120)  NULL,

  disposition_code VARCHAR(40)  NULL,

  /*
   * Recording links from TLD are signed and expire. Storing the url without
   * the expiry produces an admin page full of buttons that 403, so the UI
   * needs to know when to stop offering it and re-fetch instead.
   * TODO confirm the actual TTL against TLD once credentials exist. If the
   * links turn out to be permanent this column stays null and costs nothing.
   */
  recording_url        VARCHAR(1000) NULL,
  recording_expires_at DATETIME(3)   NULL,

  synced_at       DATETIME(3)   NOT NULL,

  PRIMARY KEY (call_id),
  KEY idx_calls_started (started_at),
  /*
   * The match query, both directions. Kept narrow and leading with the number,
   * because it runs once per unmatched click and the time window is small.
   */
  KEY idx_calls_did_time (did_number, started_at),
  KEY idx_calls_customer_time (customer_number, started_at),
  KEY idx_calls_agent_time (agent_id, started_at),
  KEY idx_calls_disposition (disposition_code, started_at),
  KEY idx_calls_tld_lead (tld_lead_id),
  KEY idx_calls_unmatched (lead_id, started_at),
  CONSTRAINT fk_calls_lead FOREIGN KEY (lead_id)
    REFERENCES leads (lead_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

/*=======================================================
        A SUBMITTED APPLICATION IS NOT AN ENROLLMENT
========================================================*/

/*
 * This is the table the whole platform exists to produce, and it is the one
 * most likely to be read wrong.
 *
 * An application submitted today may be rejected, withdrawn, or never take
 * effect. If the dashboard counts submissions as conversions then every
 * rejected application inflates the source that produced it, and budget gets
 * moved toward whichever channel is best at generating applications that fail.
 * That is worse than having no attribution at all, because it is confidently
 * wrong.
 *
 * So policy_status and effective_date are both mandatory reading. Every
 * conversion query has to state which of the two it means, and the admin pages
 * have to label it on screen.
 */
CREATE TABLE policies (
  policy_id       VARCHAR(64)   NOT NULL,
  tld_lead_id     VARCHAR(64)   NULL,
  lead_id         CHAR(36)      NULL,
  agent_id        VARCHAR(64)   NULL,

  carrier         VARCHAR(120)  NULL,
  plan_name       VARCHAR(200)  NULL,

  /*
   * MA, MAPD, PDP, DSNP. The product mix, and the thing the page level
   * attribution is ultimately measured against.
   */
  plan_type       VARCHAR(20)   NULL,

  /*
   * The CMS plan identity, contract H1234 or S5678, plan 001, segment 000.
   * Kept as three columns rather than one string, because this is what ties an
   * enrollment back to the approved marketing material that produced it, and
   * the SMID on that material is built from the same parts.
   */
  contract_id     VARCHAR(10)   NULL,
  plan_id         VARCHAR(10)   NULL,
  segment_id      VARCHAR(10)   NULL,

  -- submitted, pending, approved, rejected, withdrawn, disenrolled.
  policy_status   VARCHAR(40)   NOT NULL DEFAULT 'submitted',

  submitted_at    DATETIME(3)   NULL,
  effective_date  DATE          NULL,
  disenrolled_at  DATETIME(3)   NULL,

  premium         DECIMAL(8,2)  NULL,

  /*
   * A rejected or cancelled application can be deleted outright in TLD rather
   * than marked. Deleting our copy to match would quietly rewrite last month's
   * reported numbers, so instead the sync stamps this when a policy it has
   * seen before stops coming back. Nothing is ever hard deleted here.
   */
  missing_since   DATETIME(3)   NULL,

  synced_at       DATETIME(3)   NOT NULL,

  PRIMARY KEY (policy_id),
  KEY idx_policies_submitted (submitted_at),
  KEY idx_policies_effective (effective_date),
  KEY idx_policies_status (policy_status, submitted_at),
  KEY idx_policies_agent (agent_id, submitted_at),
  KEY idx_policies_tld_lead (tld_lead_id),
  KEY idx_policies_lead (lead_id),
  KEY idx_policies_plan (contract_id, plan_id, segment_id),
  CONSTRAINT fk_policies_lead FOREIGN KEY (lead_id)
    REFERENCES leads (lead_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Sync bookkeeping for the resources this migration adds
-- ---------------------------------------------------------------------------

/*
 * Seeded so the first run has a row to update, and so the admin area can list
 * every resource that is supposed to be syncing including the ones that have
 * never run. A resource missing from this table looks like a resource nobody
 * asked for, rather than one that is broken.
 */
INSERT INTO sync_state (resource, status) VALUES
  ('dispositions', 'idle'),
  ('agents',       'idle'),
  ('dialer_leads', 'idle'),
  ('calls',        'idle'),
  ('policies',     'idle');
