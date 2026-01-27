/**
 * Service for GitHub Repository Contents API operations
 * Handles storing and retrieving sprint data from private repository plumspzoo/Review-Data
 * Uses user's PAT token from authStore (not environment variables)
 *
 * Note: All write operations should go through operationQueueService.js
 * which provides queue serialization and retry logic for SHA conflicts.
 */

import { useAuthStore } from '../stores/authStore'
import { rateLimitedFetch } from './rateLimitService'

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

/**
 * Load available repositories from config.json
 * @returns {Promise<Array>} - Array of repository configurations
 */
export async function loadAvailableRepositories() {
  const response = await fetch('./data/config.json')
  if (!response.ok) {
    throw new Error('Nie można załadować konfiguracji')
  }
  const config = await response.json()
  return config.repositories || []
}

/**
 * Get repository configuration with user's token from authStore
 * Uses selected repository from authStore
 * Returns null if user is not authenticated or no repository is selected
 */
export async function getRepoConfig() {
  const authStore = useAuthStore()

  // Return null if user is not authenticated
  if (!authStore.isAuthenticated || !authStore.token) {
    return null
  }

  // Get selected repo from authStore
  const selectedRepo = authStore.selectedRepo
  if (!selectedRepo || !selectedRepo.dataRepo) {
    return null
  }

  return {
    owner: selectedRepo.dataRepo.owner,
    repo: selectedRepo.dataRepo.repo,
    dataPath: selectedRepo.dataRepo.dataPath,
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

  const response = await rateLimitedFetch(
    `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      cache: 'no-store'  // Prevent caching without CORS issues
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

  const response = await rateLimitedFetch(url, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    cache: 'no-store'  // Prevent caching without CORS issues
  })

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

  const response = await rateLimitedFetch(
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

  const response = await rateLimitedFetch(
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
 * List all sprint files in the repository
 * @returns {Promise<number[]>} - Array of sprint IDs sorted descending
 */
export async function listSprintFiles() {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Repository not configured - user not authenticated')
  }

  const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${config.dataPath}`

  const response = await rateLimitedFetch(url, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new Error(`Failed to list sprint files: ${response.status}`)
  }

  const files = await response.json()

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
  const sprints = []

  for (const id of sprintIds) {
    try {
      const sprint = await loadSprintFromRepo(id)
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
 * Create a new file in repository (alias for updateRepoFile without SHA)
 * @param {string} filename
 * @param {any} content
 * @returns {Promise<{sha: string}>}
 */
export async function createRepoFile(filename, content) {
  return updateRepoFile(filename, content, null)
}

/**
 * Upload a binary file to the repository (for media files)
 * @param {string} path - Full path in repository (e.g., "media/sprint-1/file.png")
 * @param {string} base64Content - Base64 encoded content
 * @param {string} commitMessage - Commit message
 * @returns {Promise<{sha: string}>}
 */
export async function uploadBinaryFile(path, base64Content, commitMessage = null) {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Repository not configured - user not authenticated')
  }

  const message = commitMessage || `Upload ${path.split('/').pop()}`

  const response = await rateLimitedFetch(
    `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message,
        content: base64Content
      })
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to upload file ${path}: ${error.message || response.status}`)
  }

  const result = await response.json()
  return { sha: result.content.sha }
}

/**
 * List contents of a directory in the repository
 * @param {string} path - Directory path in repository
 * @returns {Promise<Array<{name: string, path: string, sha: string, size: number, type: string}>>}
 */
export async function listDirectoryContents(path) {
  const config = await getRepoConfig()
  if (!config) throw new Error('Repository not configured')

  const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`
  const response = await rateLimitedFetch(url, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    cache: 'no-store'
  })

  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Failed to list directory: ${response.status}`)

  const files = await response.json()
  return files.map(f => ({ name: f.name, path: f.path, sha: f.sha, size: f.size, type: f.type }))
}

/**
 * Delete a file from the repository
 * @param {string} path - File path in repository
 * @param {string} sha - SHA of the file to delete
 * @param {string} message - Optional commit message
 * @returns {Promise<void>}
 */
export async function deleteRepoFile(path, sha, message = null) {
  const config = await getRepoConfig()
  if (!config) throw new Error('Repository not configured')

  const response = await rateLimitedFetch(
    `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({ message: message || `Delete ${path.split('/').pop()}`, sha })
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to delete: ${error.message || response.status}`)
  }
}

/**
 * Fetch a binary file from the repository as Blob
 * @param {string} path - Full path in repository
 * @returns {Promise<Blob>}
 */
export async function fetchBinaryFile(path) {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Repository not configured - user not authenticated')
  }

  // Determine MIME type from extension
  const extension = path.split('.').pop().toLowerCase()
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm'
  }
  const mimeType = mimeTypes[extension] || 'application/octet-stream'

  // First, get file metadata from Contents API
  const metadataUrl = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`

  const metadataResponse = await rateLimitedFetch(metadataUrl, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    cache: 'no-store'
  })

  if (!metadataResponse.ok) {
    throw new Error(`Failed to fetch file ${path}: ${metadataResponse.status}`)
  }

  const data = await metadataResponse.json()

  // For files > 1MB, GitHub doesn't return content directly
  // We need to use the download_url or raw endpoint
  if (data.content) {
    // Small file - content is base64 encoded
    const cleanBase64 = data.content.replace(/\n/g, '')
    const binaryString = atob(cleanBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new Blob([bytes], { type: mimeType })
  } else if (data.download_url) {
    // Large file - fetch from download_url
    // Note: For private repos, download_url already contains token as query parameter
    // Adding Authorization header would trigger CORS preflight which raw.githubusercontent.com rejects
    const downloadResponse = await fetch(data.download_url, {
      cache: 'no-store'
    })

    if (!downloadResponse.ok) {
      throw new Error(`Failed to download file ${path}: ${downloadResponse.status}`)
    }

    const arrayBuffer = await downloadResponse.arrayBuffer()
    return new Blob([arrayBuffer], { type: mimeType })
  } else {
    // Fallback: use raw media type to get content directly
    const rawResponse = await rateLimitedFetch(metadataUrl, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.raw'
      },
      cache: 'no-store'
    })

    if (!rawResponse.ok) {
      throw new Error(`Failed to fetch raw file ${path}: ${rawResponse.status}`)
    }

    const arrayBuffer = await rawResponse.arrayBuffer()
    return new Blob([arrayBuffer], { type: mimeType })
  }
}
