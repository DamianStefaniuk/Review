/**
 * GitHub API service for committing comments
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
 * Get user from auth store
 */
function getUser() {
  const authStore = useAuthStore()
  return authStore.user
}

/**
 * Set GitHub token (deprecated - use authStore.setAuth instead)
 */
export function setToken(token) {
  console.warn('setToken is deprecated, use authStore.setAuth instead')
}

/**
 * Get repo info (owner/repo) from config
 */
async function getRepoInfo() {
  try {
    const response = await fetch('./data/config.json')
    const config = await response.json()
    return config.github
  } catch {
    return null
  }
}

/**
 * Check if GitHub API is configured
 */
export function isConfigured() {
  return !!getToken()
}

/**
 * Get file content and SHA from GitHub
 */
async function getFile(owner, repo, path, branch, token) {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`)
  }

  const data = await response.json()
  return {
    content: JSON.parse(atob(data.content)),
    sha: data.sha
  }
}

/**
 * Update file in GitHub repository
 */
async function updateFile(owner, repo, path, content, sha, message, branch, token) {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
        sha,
        branch
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to update file: ${error.message || response.status}`)
  }

  return response.json()
}

/**
 * Commit a comment to the sprint JSON file
 */
export async function commitComment(sprintId, goalId, comment) {
  const token = getToken()
  if (!token) {
    console.warn('GitHub token not configured, comment will only be saved locally')
    return false
  }

  const repoInfo = await getRepoInfo()
  if (!repoInfo || !repoInfo.owner || !repoInfo.repo) {
    console.warn('GitHub repository info not configured')
    return false
  }

  const { owner, repo, branch = 'main' } = repoInfo

  try {
    const filePath = `data/sprints/sprint-${sprintId}.json`

    // Get current file content and SHA
    const { content: currentContent, sha } = await getFile(owner, repo, filePath, branch, token)

    // Add the comment to the goal
    const goal = currentContent.goals.find(g => g.id === goalId)
    if (goal) {
      if (!goal.comments) goal.comments = []
      goal.comments.push(comment)
    }

    // Get user for commit message
    const user = getUser()
    const commitMessage = `Add comment to Sprint ${sprintId}, Goal ${goalId}

Author: ${user?.name || user?.login || comment.author}
Co-Authored-By: ${user?.login || 'unknown'} <${user?.id || 0}+${user?.login || 'unknown'}@users.noreply.github.com>`

    // Commit the updated file
    await updateFile(
      owner,
      repo,
      filePath,
      currentContent,
      sha,
      commitMessage,
      branch,
      token
    )

    return true
  } catch (error) {
    console.error('Failed to commit comment to GitHub:', error)
    throw error
  }
}

/**
 * Close a sprint (mark as closed)
 */
export async function closeSprint(sprintId) {
  const token = getToken()
  if (!token) {
    throw new Error('GitHub token not configured')
  }

  const repoInfo = await getRepoInfo()
  if (!repoInfo || !repoInfo.owner || !repoInfo.repo) {
    throw new Error('GitHub repository info not configured')
  }

  const { owner, repo, branch = 'main' } = repoInfo

  try {
    const filePath = `data/sprints/sprint-${sprintId}.json`

    // Get current file content and SHA
    const { content: sprintData, sha } = await getFile(owner, repo, filePath, branch, token)

    // Update sprint status
    sprintData.status = 'closed'
    sprintData.closedAt = new Date().toISOString()

    // Commit the change
    await updateFile(
      owner,
      repo,
      filePath,
      sprintData,
      sha,
      `Close Sprint ${sprintId} Review`,
      branch,
      token
    )

    // Update current-sprint.json
    try {
      const currentSprintPath = 'data/current-sprint.json'
      const { content: currentSprintInfo, sha: currentSha } = await getFile(
        owner, repo, currentSprintPath, branch, token
      )

      if (currentSprintInfo.currentSprintId === sprintId) {
        currentSprintInfo.isActive = false

        await updateFile(
          owner,
          repo,
          currentSprintPath,
          currentSprintInfo,
          currentSha,
          `Update current sprint info after closing Sprint ${sprintId}`,
          branch,
          token
        )
      }
    } catch (err) {
      console.warn('Could not update current-sprint.json:', err)
    }

    return true
  } catch (error) {
    console.error('Failed to close sprint:', error)
    throw error
  }
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
