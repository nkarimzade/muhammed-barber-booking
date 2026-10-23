export const ADMIN_SESSION_DAYS = 30
export const ADMIN_SESSION_DURATION_MS = ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000

export function isAdminSessionExpired(loginTime, now = Date.now()) {
  const startedAt = Number(loginTime)
  return !loginTime || !Number.isFinite(startedAt) || startedAt <= 0 ||
    startedAt > now || now - startedAt >= ADMIN_SESSION_DURATION_MS
}

export function getStoredAdminToken() {
  const token = localStorage.getItem('adminToken')
  if (!token) return ''
  if (isAdminSessionExpired(localStorage.getItem('adminLoginTime'))) {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminLoginTime')
    return ''
  }
  return token
}
