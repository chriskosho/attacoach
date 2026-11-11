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
export const SHARE_TEXT = 'AttaCoach builds baseball and softball practice plans around what your team needs to work on. Free, works offline.'

// Review tools: "Skip setup" and ready-made test teams on the first screen and in Settings.
// On for now so content is easy to review. Set VITE_TEST_TOOLS=false at build time (or change the
// default) when onboarding should be required.
export const TEST_TOOLS = import.meta.env.VITE_TEST_TOOLS !== 'false'

// Where feedback goes. The coach's email app opens with a message they can read first; nothing is
// sent by AttaCoach itself. Leave this empty to hide every feedback button.
export const FEEDBACK_EMAIL = 'chriskosho@gmail.com'
