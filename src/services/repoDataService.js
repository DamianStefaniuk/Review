/**
 * Service for GitHub Repository Contents API operations
 * Handles storing and retrieving sprint data from private repository plumspzoo/Review-Data
 * Uses user's PAT token from authStore (not environment variables)
 */

import { useAuthStore } from '../stores/authStore'

const GITHUB_API_URL = 'https://api.github.com'

/**
 * Decode base64 content from GitHub API with proper UTF-8 support
 * GitHub returns base64 with newlines that need to be removed
 */
function decodeBase64Content(base64String) {
  // Remove newlines that GitHub adds to base64 content
  const cleanBase64 = base64String.replace(/\n/g, '')
  // Decode base64 to bytes, then decode as UTF-8
  const bytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

// Repository configuration - loaded from config.json
let repoConfig = null

/**
 * Load repository configuration from config.json
 */
async function loadRepoConfig() {
  if (repoConfig) return repoConfig

  try {
    const response = await fetch('./data/config.json')
    if (response.ok) {
      const config = await response.json()
      repoConfig = config.dataRepo || {
        owner: 'plumspzoo',
        repo: 'Review-Data',
        dataPath: 'sprints'
      }
    }
  } catch (error) {
    console.warn('Failed to load repo config, using defaults:', error)
    repoConfig = {
      owner: 'plumspzoo',
      repo: 'Review-Data',
      dataPath: 'sprints'
    }
  }

  return repoConfig
}

/**
 * Get repository configuration with user's token from authStore
 * Returns null if user is not authenticated
 */
export async function getRepoConfig() {
  const authStore = useAuthStore()

  // Return null if user is not authenticated
  if (!authStore.isAuthenticated || !authStore.token) {
    return null
  }

  const config = await loadRepoConfig()

  return {
    owner: config.owner,
    repo: config.repo,
    dataPath: config.dataPath,
    token: authStore.token
  }
}

/**
 * Check if repository data source is configured (user is logged in)
 */
export function isRepoDataConfigured() {
  const authStore = useAuthStore()
  return authStore.isAuthenticated && !!authStore.token
}

/**
 * Fetch a file from the repository
 * @param {string} filename - File name (without path)
 * @returns {Promise<{content: any, sha: string} | null>} - Parsed content and SHA for updates
 */
export async function fetchRepoFile(filename) {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Repository not configured - user not authenticated')
  }

  const path = `${config.dataPath}/${filename}`

  const response = await fetch(
    `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch file ${filename}: ${response.status}`)
  }

  const data = await response.json()

  // Decode base64 content with proper UTF-8 support
  const content = JSON.parse(decodeBase64Content(data.content))

  return {
    content,
    sha: data.sha
  }
}

/**
 * Fetch a root-level file from the repository (like current-sprint.json)
 * @param {string} filename - File name
 * @returns {Promise<{content: any, sha: string} | null>}
 */
export async function fetchRootFile(filename) {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Repository not configured - user not authenticated')
  }

  const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${filename}`
  console.log('[repoDataService] fetchRootFile: Fetching', url)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  console.log('[repoDataService] fetchRootFile:', filename, 'status', response.status)

  if (response.status === 404) {
    console.warn('[repoDataService] fetchRootFile:', filename, 'not found (404)')
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch file ${filename}: ${response.status}`)
  }

  const data = await response.json()

  // Decode base64 content with proper UTF-8 support
  const content = JSON.parse(decodeBase64Content(data.content))

  return {
    content,
    sha: data.sha
  }
}

/**
 * Update or create a file in the repository
 * @param {string} filename - File name (without path)
 * @param {any} content - Content to save (will be JSON stringified)
 * @param {string} sha - SHA of the file (required for updates, omit for new files)
 * @returns {Promise<{sha: string}>}
 */
export async function updateRepoFile(filename, content, sha = null) {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Repository not configured - user not authenticated')
  }

  const path = `${config.dataPath}/${filename}`
  const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  const contentBase64 = btoa(unescape(encodeURIComponent(contentString)))

  const body = {
    message: `Update ${filename}`,
    content: contentBase64
  }

  if (sha) {
    body.sha = sha
  }

  const response = await fetch(
    `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to update file ${filename}: ${error.message || response.status}`)
  }

  const result = await response.json()
  return { sha: result.content.sha }
}

/**
 * Update or create a root-level file in the repository
 * @param {string} filename - File name
 * @param {any} content - Content to save
 * @param {string} sha - SHA of the file (required for updates)
 * @returns {Promise<{sha: string}>}
 */
export async function updateRootFile(filename, content, sha = null) {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Repository not configured - user not authenticated')
  }

  const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  const contentBase64 = btoa(unescape(encodeURIComponent(contentString)))

  const body = {
    message: `Update ${filename}`,
    content: contentBase64
  }

  if (sha) {
    body.sha = sha
  }

  const response = await fetch(
    `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${filename}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to update file ${filename}: ${error.message || response.status}`)
  }

  const result = await response.json()
  return { sha: result.content.sha }
}

/**
 * Delete a file from the repository
 * @param {string} filename - File name (without path)
 * @param {string} sha - SHA of the file (required)
 */
export async function deleteRepoFile(filename, sha) {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Repository not configured - user not authenticated')
  }

  const path = `${config.dataPath}/${filename}`

  const response = await fetch(
    `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Delete ${filename}`,
        sha
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to delete file ${filename}: ${response.status}`)
  }

  return true
}

/**
 * List all sprint files in the repository
 * @returns {Promise<number[]>} - Array of sprint IDs sorted descending
 */
export async function listSprintFiles() {
  const config = await getRepoConfig()
  if (!config) {
    console.error('[repoDataService] listSprintFiles: No config - user not authenticated')
    throw new Error('Repository not configured - user not authenticated')
  }

  const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${config.dataPath}`
  console.log('[repoDataService] listSprintFiles: Fetching from', url)

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  console.log('[repoDataService] listSprintFiles: Response status', response.status)

  if (response.status === 404) {
    console.warn('[repoDataService] listSprintFiles: Directory not found (404) - sprints folder may not exist')
    return []
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[repoDataService] listSprintFiles: Error response', errorText)
    throw new Error(`Failed to list sprint files: ${response.status}`)
  }

  const files = await response.json()
  console.log('[repoDataService] listSprintFiles: Found files', files.map(f => f.name))

  return files
    .filter(f => f.name.startsWith('sprint-') && f.name.endsWith('.json'))
    .map(f => {
      const match = f.name.match(/sprint-(\d+)\.json/)
      return match ? parseInt(match[1]) : null
    })
    .filter(id => id !== null)
    .sort((a, b) => b - a) // Sort descending
}

/**
 * Load sprint data from repository
 * @param {number} sprintId
 * @returns {Promise<object>}
 */
export async function loadSprintFromRepo(sprintId) {
  const filename = `sprint-${sprintId}.json`
  const result = await fetchRepoFile(filename)

  if (!result) {
    throw new Error(`Sprint ${sprintId} not found in repository`)
  }

  // Store SHA for later updates
  result.content._sha = result.sha
  return result.content
}

/**
 * Load current sprint info from repository
 * @returns {Promise<object>}
 */
export async function loadCurrentSprintInfoFromRepo() {
  const result = await fetchRootFile('current-sprint.json')

  if (!result) {
    throw new Error('Current sprint info not found in repository')
  }

  result.content._sha = result.sha
  return result.content
}

/**
 * Load sprint list from repository
 * @returns {Promise<Array>}
 */
export async function loadSprintListFromRepo() {
  const sprintIds = await listSprintFiles()
  console.log('[repoDataService] Found sprint IDs:', sprintIds)
  const sprints = []

  for (const id of sprintIds) {
    try {
      const sprint = await loadSprintFromRepo(id)
      console.log(`[repoDataService] Loaded sprint ${id}:`, { name: sprint.name, status: sprint.status })
      sprints.push({
        id: sprint.id,
        name: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate
      })
    } catch (error) {
      console.error(`[repoDataService] Failed to load sprint ${id}:`, error)
    }
  }

  console.log('[repoDataService] Returning sprints:', sprints)
  return sprints
}

/**
 * Save sprint data to repository
 * @param {object} sprintData
 * @returns {Promise<boolean>}
 */
export async function saveSprintToRepo(sprintData) {
  const filename = `sprint-${sprintData.id}.json`

  // Get current SHA if exists
  let sha = sprintData._sha
  if (!sha) {
    try {
      const existing = await fetchRepoFile(filename)
      sha = existing?.sha
    } catch {
      // File doesn't exist yet, that's OK
    }
  }

  // Remove internal SHA before saving
  const dataToSave = { ...sprintData }
  delete dataToSave._sha

  await updateRepoFile(filename, dataToSave, sha)
  return true
}

/**
 * Update current sprint info in repository
 * @param {number} sprintId
 * @param {boolean} isActive
 * @returns {Promise<boolean>}
 */
export async function updateCurrentSprintInfoInRepo(sprintId, isActive) {
  // Get current SHA
  let sha = null
  try {
    const existing = await fetchRootFile('current-sprint.json')
    sha = existing?.sha
  } catch {
    // File doesn't exist yet
  }

  await updateRootFile('current-sprint.json', {
    currentSprintId: sprintId,
    isActive
  }, sha)

  return true
}

/**
 * Add comment to a goal in repository
 * @param {number} sprintId
 * @param {number|string} goalId
 * @param {object} comment
 * @param {boolean} isSideGoal
 * @returns {Promise<boolean>}
 */
export async function addCommentToRepo(sprintId, goalId, comment, isSideGoal = false) {
  const filename = `sprint-${sprintId}.json`
  const result = await fetchRepoFile(filename)

  if (!result) {
    throw new Error(`Sprint ${sprintId} not found in repository`)
  }

  const sprintData = result.content

  // Find the goal in main goals or side goals
  let goal
  if (isSideGoal) {
    goal = sprintData.sideGoals?.find(g => g.id === goalId)
    if (!goal) {
      throw new Error(`Side goal ${goalId} not found in sprint ${sprintId}`)
    }
  } else {
    goal = sprintData.goals.find(g => g.id === goalId)
    if (!goal) {
      throw new Error(`Goal ${goalId} not found in sprint ${sprintId}`)
    }
  }

  if (!goal.comments) {
    goal.comments = []
  }

  goal.comments.push(comment)

  // Save updated sprint data
  await updateRepoFile(filename, sprintData, result.sha)

  return true
}

/**
 * Add comment to a side goal in repository
 * @param {number} sprintId
 * @param {number|string} sideGoalId
 * @param {object} comment
 * @returns {Promise<boolean>}
 */
export async function addCommentToSideGoalInRepo(sprintId, sideGoalId, comment) {
  return addCommentToRepo(sprintId, sideGoalId, comment, true)
}

/**
 * Create a new file in repository (alias for updateRepoFile without SHA)
 * @param {string} filename
 * @param {any} content
 * @returns {Promise<{sha: string}>}
 */
export async function createRepoFile(filename, content) {
  return updateRepoFile(filename, content, null)
}
