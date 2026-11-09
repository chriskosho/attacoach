import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js'

export const AUTH_STORAGE_KEY = 'attacoach-auth'

let client = null

// Created on first use, so the page can read any error in the sign-in link first.
export function getClient() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Tokens arrive in the link's #fragment, so the link works in whichever browser opens it.
        flowType: 'implicit',
      },
    })
  }
  return client
}
