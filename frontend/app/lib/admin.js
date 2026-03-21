const DEFAULT_ADMIN_EMAILS = ['admin@store.com', 'yan228322@gmail.com']

function parseAdminEmails(raw) {
  if (!raw) return DEFAULT_ADMIN_EMAILS
  return raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
}

export const ADMIN_EMAILS = parseAdminEmails(process.env.NEXT_PUBLIC_ADMIN_EMAILS)

export function isAdminEmail(email) {
  if (!email) return false
  return ADMIN_EMAILS.includes(String(email).toLowerCase())
}
