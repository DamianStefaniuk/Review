/**
 * Service for GitHub Gist API operations
 * Handles storing and retrieving sprint data from Gist
 */

import { useAuthStore } from '../stores/authStore'

const GITHUB_API_URL = 'https://api.github.com'

/**
 * Get Gist configuration from environment variables
 * Returns null if user is not authenticated
 */
export function getGistConfig() {
  const authStore = useAuthStore()

  // Return null if user is not authenticated
  if (!authStore.isAuthenticated) {
    return null
  }

  // Use environment variables
  const gistId = import.meta.env.VITE_GIST_ID
  const gistToken = import.meta.env.VITE_GIST_TOKEN

  if (gistId && gistToken) {
    return { gistId, gistToken }
  }

  return null
}

/**
 * Check if Gist is configured (env variables are set)
 */
export function isGistConfigured() {
  const gistId = import.meta.env.VITE_GIST_ID
  const gistToken = import.meta.env.VITE_GIST_TOKEN
  return !!(gistId && gistToken)
}

/**
 * Validate Gist token by attempting to fetch the Gist
 */
export async function validateGistToken(gistId, token) {
  try {
    const response = await fetch(`${GITHUB_API_URL}/gists/${gistId}`, {
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

/**
 * Fetch entire Gist data
 */
export async function fetchGist() {
  const config = getGistConfig()
  if (!config) {
    throw new Error('Gist not configured')
  }

  const response = await fetch(`${GITHUB_API_URL}/gists/${config.gistId}`, {
    headers: {
      'Authorization': `Bearer ${config.gistToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Gist: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch a single file from Gist
 */
export async function fetchGistFile(filename) {
  const gist = await fetchGist()
  const file = gist.files[filename]

  if (!file) {
    return null
  }

  // If content is truncated, fetch from raw_url
  if (file.truncated && file.raw_url) {
    const config = getGistConfig()
    const response = await fetch(file.raw_url, {
      headers: {
        'Authorization': `Bearer ${config.gistToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch raw content: ${response.status}`)
    }
    return response.json()
  }

  // Parse JSON content
  try {
    return JSON.parse(file.content)
  } catch {
    return file.content
  }
}

/**
 * Update a single file in Gist
 */
export async function updateGistFile(filename, content) {
  const config = getGistConfig()
  if (!config) {
    throw new Error('Gist not configured')
  }

  const response = await fetch(`${GITHUB_API_URL}/gists/${config.gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${config.gistToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      files: {
        [filename]: {
          content: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
        }
      }
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to update Gist file: ${error.message || response.status}`)
  }

  return response.json()
}

/**
 * Create a new file in Gist
 */
export async function createGistFile(filename, content) {
  return updateGistFile(filename, content)
}

/**
 * Delete a file from Gist
 */
export async function deleteGistFile(filename) {
  const config = getGistConfig()
  if (!config) {
    throw new Error('Gist not configured')
  }

  const response = await fetch(`${GITHUB_API_URL}/gists/${config.gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${config.gistToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      files: {
        [filename]: null
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to delete Gist file: ${response.status}`)
  }

  return response.json()
}

/**
 * List all sprint files in Gist
 */
export async function listSprintFiles() {
  const gist = await fetchGist()
  const files = Object.keys(gist.files)

  return files
    .filter(f => f.startsWith('sprint-') && f.endsWith('.json'))
    .map(f => {
      const match = f.match(/sprint-(\d+)\.json/)
      return match ? parseInt(match[1]) : null
    })
    .filter(id => id !== null)
    .sort((a, b) => b - a) // Sort descending
}

/**
 * Load sprint data from Gist
 */
export async function loadSprintFromGist(sprintId) {
  const filename = `sprint-${sprintId}.json`
  const data = await fetchGistFile(filename)

  if (!data) {
    throw new Error(`Sprint ${sprintId} not found in Gist`)
  }

  return data
}

/**
 * Load current sprint info from Gist
 */
export async function loadCurrentSprintInfoFromGist() {
  const data = await fetchGistFile('current-sprint.json')

  if (!data) {
    throw new Error('Current sprint info not found in Gist')
  }

  return data
}

/**
 * Load sprint list from Gist
 */
export async function loadSprintListFromGist() {
  const sprintIds = await listSprintFiles()
  const sprints = []

  for (const id of sprintIds) {
    try {
      const sprint = await loadSprintFromGist(id)
      sprints.push({
        id: sprint.id,
        name: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate
      })
    } catch {
      // Skip sprints that fail to load
    }
  }

  return sprints
}

/**
 * Add comment to a goal in Gist
 */
export async function addCommentToGist(sprintId, goalId, comment) {
  const filename = `sprint-${sprintId}.json`
  const sprintData = await fetchGistFile(filename)

  if (!sprintData) {
    throw new Error(`Sprint ${sprintId} not found in Gist`)
  }

  // Find the goal and add comment
  const goal = sprintData.goals.find(g => g.id === goalId)
  if (!goal) {
    throw new Error(`Goal ${goalId} not found in sprint ${sprintId}`)
  }

  if (!goal.comments) {
    goal.comments = []
  }

  goal.comments.push(comment)

  // Save updated sprint data
  await updateGistFile(filename, sprintData)

  return true
}

/**
 * Save sprint data to Gist
 */
export async function saveSprintToGist(sprintData) {
  const filename = `sprint-${sprintData.id}.json`
  await updateGistFile(filename, sprintData)
  return true
}

/**
 * Update current sprint info in Gist
 */
export async function updateCurrentSprintInfoInGist(sprintId, isActive) {
  await updateGistFile('current-sprint.json', {
    currentSprintId: sprintId,
    isActive
  })
  return true
}

/**
 * Add comment to a side goal in Gist
 */
export async function addCommentToSideGoalInGist(sprintId, sideGoalId, comment) {
  const filename = `sprint-${sprintId}.json`
  const sprintData = await fetchGistFile(filename)

  if (!sprintData) {
    throw new Error(`Sprint ${sprintId} not found in Gist`)
  }

  // Find the side goal and add comment
  const sideGoals = sprintData.sideGoals || []
  const sideGoal = sideGoals.find(sg => sg.id === sideGoalId)
  if (!sideGoal) {
    throw new Error(`Side goal ${sideGoalId} not found in sprint ${sprintId}`)
  }

  if (!sideGoal.comments) {
    sideGoal.comments = []
  }

  sideGoal.comments.push(comment)

  // Save updated sprint data
  await updateGistFile(filename, sprintData)

  return true
}
