/*
 * 004 Requests made under a state privacy law, and the clock that runs on them.
 *
 * The privacy rights page publishes a 30 day response deadline, so a request
 * arriving by phone and written on a notepad is a commitment nobody can see.
 * This table is the record and the timer.
 *
 * It also exists because of the dialer vendor. They will not delete a lead
 * without a copy of the written demand, so a request that was only ever spoken
 * aloud cannot be acted on at all. A row here is that document.
 */

/*=======================================================
        THE ROW IS EVIDENCE, NOT A TASK TICKET
========================================================*/

/*
 * attestation_text stores the exact wording the person agreed to, copied at
 * submission rather than looked up later. The page copy will change. What was
 * on screen the day they submitted will not, and that is the only version that
 * matters if the request is ever disputed.
 *
 * Same reasoning as lead_consents. Never replace this with a version number
 * pointing at current page copy.
 */
CREATE TABLE privacy_requests (
  request_id      CHAR(36)        NOT NULL,
  received_at     TIMESTAMPTZ(3)  NOT NULL,

  /*
   * The published deadline, written at insert rather than computed on read.
   * The page can change from 30 days to something else, and a request must be
   * held to the promise that was on the page when it arrived.
   */
  due_at          TIMESTAMPTZ(3)  NOT NULL,

  /*
   * know, copy, correct, delete, optOut, limitSensitive.
   * Matches the rights list on the privacy rights page. Free text rather than
   * an enum so adding a right is a code change, not a migration.
   */
  request_type    VARCHAR(20)   NOT NULL,

  /*
   * The identifier a request is verified against, per the privacy rights page.
   * Required, because a request we cannot tie to a record is one we cannot
   * action, refuse, or evidence.
   */
  phone           VARCHAR(20)   NOT NULL,
  email           VARCHAR(255)  NOT NULL,
  first_name      VARCHAR(120)  NULL,
  last_name       VARCHAR(120)  NULL,

  -- Which state law applies, since the rights and the deadlines differ
  state           CHAR(2)       NULL,

  -- self or other. relationship is only meaningful when it is other
  on_behalf_of    VARCHAR(10)   NOT NULL,
  relationship    VARCHAR(120)  NULL,

  details         TEXT          NULL,
  attestation_text TEXT         NOT NULL,

  /*
   * Captured for the same reason lead_consents captures them, so the record
   * can answer where and when rather than only what.
   */
  source_url      VARCHAR(500)  NULL,
  ip_address      VARCHAR(45)   NULL,
  user_agent      VARCHAR(500)  NULL,

  /*
   *   received   submitted, nobody has looked at it
   *   verified   identity confirmed against the phone number
   *   filed      sent to the dialer vendor, waiting on their 48 hours
   *   completed  done, and the requester has been told
   *   refused    declined, which state law allows in defined cases
   */
  status          VARCHAR(20)   NOT NULL DEFAULT 'received',

  PRIMARY KEY (request_id)
);

-- The overdue query, which is the only one that matters operationally
CREATE INDEX idx_privacy_requests_open ON privacy_requests (status, due_at);

-- Finding every request from one person, which is how a follow up is handled
CREATE INDEX idx_privacy_requests_phone ON privacy_requests (phone);

CREATE INDEX idx_privacy_requests_received ON privacy_requests (received_at);
