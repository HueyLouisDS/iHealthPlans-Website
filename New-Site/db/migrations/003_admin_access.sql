/*
 * 003 Who may open the admin area, and the invites that get them there.
 *
 * Replaces LH_ADMIN_ALLOWED_EMAILS, which was a comma separated environment
 * variable. That worked while the list was edited by hand on a laptop. It
 * cannot survive a deploy, because a hosted app reads its environment from the
 * host and nothing in the running site can write to it, so the admin page was
 * read only anywhere it actually mattered.
 *
 * Two tables rather than one. A person is a lasting fact, an invite is an
 * event with an expiry that can happen more than once for the same person.
 */

/*=======================================================
        BEING ON THE LIST IS NOT THE SAME AS BEING VERIFIED
========================================================*/

/*
 * status carries that difference and the admin UI shows it.
 *
 *   invited   on the list, has never completed a Google sign in
 *   active    has signed in, and the account is theirs
 *   revoked   was active, is not any more
 *
 * An address that sits at invited for weeks is almost always a typo nobody
 * noticed rather than somebody who has not got round to it, and that is worth
 * seeing on the page.
 *
 * Revoked rather than deleted. Removing the row loses the record that they
 * ever had access, which is the first thing anyone asks for after an incident.
 * Access is decided on status, never on the row existing.
 */
CREATE TABLE admin_users (
  /*
   * Lowercased before it is written. Email comparison is not case sensitive,
   * and a mixed case row here is an account that silently never matches.
   */
  email           VARCHAR(255)    NOT NULL,

  status          VARCHAR(20)     NOT NULL DEFAULT 'invited',

  /*
   * Google's subject claim, the stable identifier for the account. Set when
   * they first sign in and never after. An address can be renamed inside a
   * Workspace, and when it is, this is what says the new address is still the
   * same person rather than a stranger who inherited the mailbox.
   */
  google_sub      VARCHAR(255)    NULL,

  full_name       VARCHAR(120)    NULL,

  invited_by      VARCHAR(255)    NULL,
  invited_at      TIMESTAMPTZ(3)  NOT NULL,
  activated_at    TIMESTAMPTZ(3)  NULL,
  revoked_at      TIMESTAMPTZ(3)  NULL,
  revoked_by      VARCHAR(255)    NULL,

  -- Answers who has actually been in here lately, which the env list could not
  last_seen_at    TIMESTAMPTZ(3)  NULL,

  PRIMARY KEY (email)
);

CREATE INDEX idx_admin_users_status ON admin_users (status, email);

/*
 * One Google account, one row. Partial so the many rows with a null sub, the
 * invited ones, do not collide with each other.
 */
CREATE UNIQUE INDEX uq_admin_users_google_sub
  ON admin_users (google_sub) WHERE google_sub IS NOT NULL;

/*=======================================================
        THE TOKEN IS NEVER STORED, ONLY ITS HASH
========================================================*/

/*
 * A row here is a live credential if it holds the token. Anyone who can read
 * this table, a backup, a dump, a support query, could then walk into the
 * admin area as somebody else.
 *
 * So the token is generated, hashed with sha256, and the hash is written. The
 * token itself exists once, in the link that goes out, and nowhere after that.
 * A lost invite is reissued rather than recovered.
 *
 * The token alone is not enough to get in either. It proves the invite is
 * real, Google proves who is holding it, and both have to agree on the same
 * address. Without that second half, anyone the email is forwarded to is in.
 */
CREATE TABLE admin_invites (
  token_hash      CHAR(64)        NOT NULL,

  /*
   * Kept alongside the hash so the accepting request can check the Google
   * account matches the person actually invited, rather than only that the
   * token is valid.
   */
  email           VARCHAR(255)    NOT NULL,

  created_at      TIMESTAMPTZ(3)  NOT NULL,
  created_by      VARCHAR(255)    NULL,

  /*
   * Short by design. An invite is a credential sitting in a mailbox, and a
   * link that works forever is one that works after the laptop is sold.
   */
  expires_at      TIMESTAMPTZ(3)  NOT NULL,

  /*
   * Single use. Set when accepted, and checked before anything else, so a
   * link that has already been used is dead even inside its window.
   */
  consumed_at     TIMESTAMPTZ(3)  NULL,

  PRIMARY KEY (token_hash),
  CONSTRAINT fk_invites_user FOREIGN KEY (email)
    REFERENCES admin_users (email) ON DELETE CASCADE
);

-- The lookup on accept, and the sweep for expired rows
CREATE INDEX idx_invites_email ON admin_invites (email, created_at);
CREATE INDEX idx_invites_pending ON admin_invites (consumed_at, expires_at);
