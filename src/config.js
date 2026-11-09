// Public settings. The Supabase publishable key is meant to ship in the browser:
// it can only do what row-level security and the auth rules allow.
export const SUPABASE_URL = 'https://pretxxjkcngmnksepwbt.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_vB1lalvWJ7nzecGrgMNiKQ_kpNO4VAn'

// The sign-in gate is built but switched off. To turn it on, set VITE_AUTH_REQUIRED=true at
// build time (or change the default here) after finishing the Supabase setup in the README.
// While it is off, the app never contacts Supabase and shows no account controls.
export const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === 'true'

export const APP_URL = 'https://chriskosho.github.io/attacoach/'
export const DONATE_URL = 'https://paypal.me/chriskosho'
export const SHARE_TEXT = 'AttaCoach builds baseball practice plans around what your team needs to work on. Free, works offline.'
