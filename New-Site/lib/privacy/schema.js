// One definition of what a privacy request is, shared by the form and the
// route that stores it.
//
// Modelled on lib/leads/schema.js for the same reason that file exists. A
// validator on the client and a different one on the server drift, and the
// first thing to drift is which fields are required.

import { normalisePhone } from '@/lib/leads/schema'

const MAX_TEXT = 120
const MAX_DETAILS = 2000

// Must match REQUEST_TYPES in lib/content/privacyRequest.js
export const REQUEST_TYPES = ['know', 'copy', 'correct', 'delete', 'optOut', 'limitSensitive']
export const ON_BEHALF = ['self', 'other']

// The published deadline on the privacy rights page. Both move together
export const RESPONSE_DAYS = 30

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const STATE_SHAPE = /^[A-Z]{2}$/

function text(value, limit = MAX_TEXT) {
  return String(value ?? '').trim().slice(0, limit)
}

/*
 Returns a map of field name to message, empty when the request is valid. The
 messages are keys into COPY rather than sentences, because this module is
 imported by both the client and the server and neither should be inventing
 consumer wording.
*/
export function validateRequest(body) {
  const errors = {}

  if (!REQUEST_TYPES.includes(String(body?.requestType))) {
    errors.requestType = 'errorRequired'
  }

  if (!ON_BEHALF.includes(String(body?.onBehalfOf))) {
    errors.onBehalfOf = 'errorRequired'
  }

  if (!normalisePhone(body?.phone)) {
    errors.phone = 'errorPhone'
  }

  const email = text(body?.email, 255).toLowerCase()
  if (!email) {
    errors.email = 'errorRequired'
  } else if (!EMAIL_SHAPE.test(email)) {
    errors.email = 'errorEmail'
  }

  const state = text(body?.state, 2).toUpperCase()
  if (state && !STATE_SHAPE.test(state)) {
    errors.state = 'errorRequired'
  }

  /*
   The attestation is the difference between a form submission and a written
   demand the vendor will act on. An unticked box is not a request.
  */
  if (body?.attestationAccepted !== true) {
    errors.attestationAccepted = 'errorAttestation'
  }

  if (!text(body?.attestationText, MAX_DETAILS)) {
    errors.attestationText = 'errorGeneric'
  }

  return errors
}

// Turns a validated body into the row shape, with the clock already started
export function normaliseRequest(body, { sourceUrl, ipAddress, userAgent } = {}) {
  const receivedAt = new Date()

  return {
    receivedAt: receivedAt.toISOString(),
    dueAt: new Date(receivedAt.getTime() + RESPONSE_DAYS * 86400000).toISOString(),

    requestType: String(body.requestType),
    onBehalfOf: String(body.onBehalfOf),
    relationship: body.onBehalfOf === 'other' ? text(body.relationship) || null : null,

    phone: normalisePhone(body.phone),
    email: text(body.email, 255).toLowerCase(),
    firstName: text(body.firstName) || null,
    lastName: text(body.lastName) || null,
    state: text(body.state, 2).toUpperCase() || null,

    details: text(body.details, MAX_DETAILS) || null,
    attestationText: text(body.attestationText, MAX_DETAILS),

    sourceUrl: text(sourceUrl, 500) || null,
    ipAddress: text(ipAddress, 45) || null,
    userAgent: text(userAgent, 500) || null,
  }
}

/*
 Safe to log. The point of a request is its type and its clock, and neither of
 those needs the person's name in a log line.
*/
export function redactRequest(request) {
  return {
    requestType: request.requestType,
    onBehalfOf: request.onBehalfOf,
    state: request.state,
    receivedAt: request.receivedAt,
    dueAt: request.dueAt,
    hasDetails: Boolean(request.details),
  }
}
