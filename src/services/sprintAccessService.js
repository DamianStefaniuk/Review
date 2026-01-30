/**
 * Sprint Access Control Service
 *
 * Provides client-side access control for sprints.
 * Note: This is "security through obscurity" - it protects against
 * accidental access but not against intentional attacks.
 * GitHub API provides the real authorization layer.
 */

/**
 * Whitelist of sprints accessible to users
 * Format: sprintId -> '*' (all logged-in users) or array of user logins
 * In the future, this could be loaded from a config file in the repository
 */
const SPRINT_ACCESS = {
  // All sprints are accessible to all authenticated users by default
  // Add specific sprint IDs here to restrict access
  // Example: '8663': ['user1', 'user2'],
  '*': '*'  // Default: all sprints accessible to all authenticated users
}

/**
 * Check if a user can access a specific sprint
 *
 * @param {string|number} sprintId - Sprint ID to check
 * @param {string} userLogin - User's GitHub login
 * @returns {boolean} True if user can access the sprint
 */
export function canAccessSprint(sprintId, userLogin) {
  if (!userLogin) return false

  const sprintIdStr = String(sprintId)

  // Check specific sprint access first
  const specificAccess = SPRINT_ACCESS[sprintIdStr]
  if (specificAccess !== undefined) {
    if (specificAccess === '*') return true
    if (Array.isArray(specificAccess)) return specificAccess.includes(userLogin)
    return false
  }

  // Fall back to default access rule
  const defaultAccess = SPRINT_ACCESS['*']
  if (defaultAccess === '*') return true
  if (Array.isArray(defaultAccess)) return defaultAccess.includes(userLogin)

  // If no rule matches, deny access
  return false
}

