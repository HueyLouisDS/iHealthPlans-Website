-- 001 Identity chain, consent, sync state, and the audit trail.
--
-- The identity chain is the whole engagement:
--   visitor -> session -> call_click -> call -> lead -> conversion
--
-- This migration builds everything the site originates itself. The TLD
-- mirrors come next, once the sync exists, and they join onto these.
--
-- Every timestamp is UTC. The driver is configured with timezone Z and
-- dateStrings, so nothing here is ever parsed in a local timezone.

-- ---------------------------------------------------------------------------
-- Visitors and sessions
-- ---------------------------------------------------------------------------

CREATE TABLE visitors (
  visitor_id      CHAR(36)     NOT NULL,
  first_seen_at   DATETIME(3)  NOT NULL,
  last_seen_at    DATETIME(3)  NOT NULL,

  -- First touch, held on the visitor rather than the session, because the
  -- source that first found somebody is what earned the eventual enrollment
  -- even if they arrive direct three visits later.
  first_source        VARCHAR(120)  NULL,
  first_medium        VARCHAR(120)  NULL,
  first_campaign      VARCHAR(200)  NULL,
  first_content       VARCHAR(200)  NULL,
  first_term          VARCHAR(200)  NULL,
  first_landing_page  VARCHAR(500)  NULL,
  first_referrer      VARCHAR(500)  NULL,
  first_gclid         VARCHAR(255)  NULL,
  first_fbclid        VARCHAR(255)  NULL,
  first_msclkid       VARCHAR(255)  NULL,

  PRIMARY KEY (visitor_id),
  KEY idx_visitors_first_seen (first_seen_at),
  KEY idx_visitors_first_source (first_source, first_campaign)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  session_id      CHAR(36)     NOT NULL,
  visitor_id      CHAR(36)     NOT NULL,
  started_at      DATETIME(3)  NOT NULL,
  last_active_at  DATETIME(3)  NOT NULL,

  -- Last touch, which is what the session itself arrived on. Kept alongside
  -- the visitor's first touch so both attribution models can be reported
  -- without re-deriving either.
  source          VARCHAR(120)  NULL,
  medium          VARCHAR(120)  NULL,
  campaign        VARCHAR(200)  NULL,
  content         VARCHAR(200)  NULL,
  term            VARCHAR(200)  NULL,
  landing_page    VARCHAR(500)  NULL,
  referrer        VARCHAR(500)  NULL,
  gclid           VARCHAR(255)  NULL,
  fbclid          VARCHAR(255)  NULL,
  msclkid         VARCHAR(255)  NULL,

  device          VARCHAR(20)   NULL,
  -- Truncated to a /24 before storage. A full address is personal data under
  -- several state privacy laws and is not needed for anything this reports.
  ip_prefix       VARCHAR(45)   NULL,
  user_agent      VARCHAR(500)  NULL,

  PRIMARY KEY (session_id),
  KEY idx_sessions_visitor (visitor_id),
  KEY idx_sessions_started (started_at),
  KEY idx_sessions_source (source, campaign),
  CONSTRAINT fk_sessions_visitor FOREIGN KEY (visitor_id)
    REFERENCES visitors (visitor_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Click to call
-- ---------------------------------------------------------------------------

-- The fragile link in the whole chain. A tel: link leaves no trace, so the
-- binding between a web session and the call that follows has to be minted at
-- click time and matched afterwards against the call log.
CREATE TABLE call_clicks (
  click_id        CHAR(36)     NOT NULL,
  session_id      CHAR(36)     NOT NULL,
  visitor_id      CHAR(36)     NOT NULL,
  clicked_at      DATETIME(3)  NOT NULL,

  -- Where on the page it was clicked. A header click and a hero click are
  -- very different intent signals and the funnel should not merge them.
  location        VARCHAR(120)  NOT NULL,
  page_path       VARCHAR(500)  NOT NULL,

  -- The number actually presented. Once tracking numbers are pooled this is
  -- what ties the call back, so it is stored even while there is only one.
  presented_number VARCHAR(20)  NOT NULL,

  -- Filled by the matcher once a call is found. Null means unmatched, which
  -- is the metric that says whether any of this is working.
  matched_call_id  VARCHAR(64)  NULL,
  matched_at       DATETIME(3)  NULL,
  match_method     VARCHAR(40)  NULL,

  PRIMARY KEY (click_id),
  KEY idx_clicks_session (session_id),
  KEY idx_clicks_clicked (clicked_at),
  KEY idx_clicks_unmatched (matched_call_id, clicked_at),
  KEY idx_clicks_number_time (presented_number, clicked_at),
  CONSTRAINT fk_clicks_session FOREIGN KEY (session_id)
    REFERENCES sessions (session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Leads the site originates
-- ---------------------------------------------------------------------------

CREATE TABLE leads (
  lead_id         CHAR(36)      NOT NULL,
  received_at     DATETIME(3)   NOT NULL,

  -- Null for a lead that arrived without a session, which is every vendor
  -- lead and any form submission where the cookie was blocked.
  session_id      CHAR(36)      NULL,
  visitor_id      CHAR(36)      NULL,

  origin          VARCHAR(20)   NOT NULL,
  source          VARCHAR(120)  NOT NULL,
  vendor_id       VARCHAR(60)   NULL,
  -- The sender's own id, so a retry is recognised rather than becoming a
  -- second lead, which is an agent calling the same person twice.
  external_id     VARCHAR(120)  NULL,

  phone           VARCHAR(20)   NOT NULL,
  first_name      VARCHAR(120)  NULL,
  last_name       VARCHAR(120)  NULL,
  email           VARCHAR(255)  NULL,
  zip             CHAR(5)       NULL,
  on_behalf_of    VARCHAR(10)   NULL,
  best_time       VARCHAR(40)   NULL,

  -- Set once the lead has been pushed to TLD, so a failed push is visible
  -- rather than silently dropping the lead.
  tld_lead_id     VARCHAR(64)   NULL,
  pushed_at       DATETIME(3)   NULL,
  push_error      VARCHAR(500)  NULL,

  PRIMARY KEY (lead_id),
  UNIQUE KEY uq_leads_vendor_external (vendor_id, external_id),
  KEY idx_leads_received (received_at),
  KEY idx_leads_phone (phone),
  KEY idx_leads_source (source, received_at),
  KEY idx_leads_unpushed (pushed_at, received_at),
  CONSTRAINT fk_leads_session FOREIGN KEY (session_id)
    REFERENCES sessions (session_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Consent
-- ---------------------------------------------------------------------------

-- Its own table rather than columns on leads, because consent is an event
-- with a time and a version, and somebody can grant it, withdraw it, and
-- grant it again. A boolean on the lead row cannot represent that, and the
-- question that gets asked in a complaint is always "what did they agree to
-- on this date", never "are they currently opted in".
CREATE TABLE lead_consents (
  consent_id      CHAR(36)      NOT NULL,
  lead_id         CHAR(36)      NOT NULL,
  captured_at     DATETIME(3)   NOT NULL,

  -- The exact wording shown, stored verbatim and never summarised. A hash of
  -- it lets identical captures be grouped without comparing 2KB of text.
  consent_text    TEXT          NOT NULL,
  consent_hash    CHAR(64)      NOT NULL,
  consent_version VARCHAR(40)   NULL,

  source_url      VARCHAR(500)  NOT NULL,
  ip_address      VARCHAR(45)   NOT NULL,
  user_agent      VARCHAR(500)  NULL,
  -- One to one consent names the agent. Null until that is settled.
  agent_name      VARCHAR(120)  NULL,

  withdrawn_at    DATETIME(3)   NULL,
  withdrawn_via   VARCHAR(60)   NULL,

  PRIMARY KEY (consent_id),
  KEY idx_consents_lead (lead_id, captured_at),
  KEY idx_consents_hash (consent_hash),
  CONSTRAINT fk_consents_lead FOREIGN KEY (lead_id)
    REFERENCES leads (lead_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Sync state
-- ---------------------------------------------------------------------------

-- One row per synced resource. This is what lets a page say how fresh its
-- numbers are, and a dashboard that cannot say that stops being believed the
-- first time somebody spots a discrepancy.
CREATE TABLE sync_state (
  resource        VARCHAR(60)   NOT NULL,
  last_run_at     DATETIME(3)   NULL,
  last_success_at DATETIME(3)   NULL,
  -- Where the next incremental pull resumes from
  cursor_value    VARCHAR(255)  NULL,
  rows_last_run   INT           NULL,
  -- Compared against the previous run. A pull that comes back materially
  -- smaller is refused rather than written, because silent shrinkage looks
  -- exactly like good news.
  rows_total      INT           NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'idle',
  last_error      VARCHAR(1000) NULL,
  duration_ms     INT           NULL,

  PRIMARY KEY (resource)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

-- Replaces the console.warn calls in the export routes. A log that rotates is
-- not an audit trail, and the question this answers is who took beneficiary
-- data out of the system and when.
CREATE TABLE audit_log (
  audit_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  occurred_at     DATETIME(3)   NOT NULL,
  actor_email     VARCHAR(255)  NOT NULL,
  action          VARCHAR(60)   NOT NULL,
  resource        VARCHAR(60)   NOT NULL,
  record_count    INT           NULL,
  -- The filters that selected the records, so an export can be reproduced
  filters_json    JSON          NULL,
  -- Explicit id selection, when there was one
  selection_json  JSON          NULL,
  ip_prefix       VARCHAR(45)   NULL,

  PRIMARY KEY (audit_id),
  KEY idx_audit_occurred (occurred_at),
  KEY idx_audit_actor (actor_email, occurred_at),
  KEY idx_audit_action (action, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
