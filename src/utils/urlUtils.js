/**
 * URL Security Utilities
 */

/**
 * Validate jiraBaseUrl and return safe URL for task link
 * Prevents open redirect attacks by validating the URL protocol
 * @param {string} jiraBaseUrl - Base URL for Jira
 * @param {string} taskKey - Task key (e.g., "PROJ-123")
 * @returns {string|undefined} Safe URL or undefined if invalid
 */
export function getSafeJiraUrl(jiraBaseUrl, taskKey) {
  if (!jiraBaseUrl || !taskKey) return undefined

  try {
    const parsed = new URL(jiraBaseUrl)
    // Only allow http/https protocols to prevent javascript: or other dangerous protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return undefined
    }
    return `${jiraBaseUrl}/browse/${taskKey}`
  } catch {
    // Invalid URL format
    return undefined
  }
}
