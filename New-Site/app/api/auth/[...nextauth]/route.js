/**
 * Auth.js route handler. Serves the OAuth callback and session endpoints.
 * All the actual policy lives in auth.js at the project root, this file only
 * wires the handlers to a route.
 */

import { handlers } from '@/auth'

export const { GET, POST } = handlers
