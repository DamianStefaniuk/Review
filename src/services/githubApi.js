/**
 * GitHub API service for token validation
 *
 * Note: Comment committing and sprint closing have been migrated to repoDataService.js
 * and sprintManagementService.js respectively.
 */

import { useAuthStore } from '../stores/authStore'

const GITHUB_API_URL = 'https://api.github.com'

/**
 * Get GitHub token from auth store
 */
function getToken() {
  const authStore = useAuthStore()
  return authStore.token
}

/**
 * Check if GitHub API is configured
 */
export function isConfigured() {
  return !!getToken()
}

/**
 * Validate GitHub token
 */
export async function validateToken(token) {
  try {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    return response.ok
  } catch {
    return false
  }
}
