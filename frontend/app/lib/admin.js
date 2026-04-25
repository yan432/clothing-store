// NEXT_PUBLIC_ADMIN_EMAILS используется только для показа/скрытия UI элементов
// Реальная защита маршрутов происходит в middleware.js через приватный ADMIN_EMAILS
function parseAdminEmails(raw) {
  if (!raw) return []
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
