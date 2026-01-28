/**
 * Service for triggering GitHub Actions workflows
 */

import { useAuthStore } from '../stores/authStore'
import { rateLimitedFetch } from './rateLimitService'

const GITHUB_API_URL = 'https://api.github.com'

/**
 * Get GitHub token from auth store
 */
function getToken() {
  const authStore = useAuthStore()
  return authStore.token
}

/**
 * Get selected repository ID from auth store
 */
function getSelectedRepoId() {
  const authStore = useAuthStore()
  return authStore.selectedRepo?.id || null
}

/**
 * Get repo info from config (main repo where workflows are located)
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
 * Trigger Jira sync workflow
 */
export async function triggerJiraSyncWorkflow() {
  const token = getToken()
  if (!token) {
    throw new Error('GitHub token not configured')
  }

  const repoInfo = await getRepoInfo()
  if (!repoInfo || !repoInfo.owner || !repoInfo.repo) {
    throw new Error('GitHub repository info not configured')
  }

  const repositoryId = getSelectedRepoId()
  if (!repositoryId) {
    throw new Error('Nie wybrano projektu do synchronizacji')
  }

  const { owner, repo, branch = 'main' } = repoInfo

  const response = await rateLimitedFetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/actions/workflows/sync-jira-on-demand.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: branch,
        inputs: {
          repository_id: repositoryId
        }
      })
    }
  )

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Brak uprawnień do uruchomienia synchronizacji. Token wymaga uprawnienia "workflow".')
    }
    if (response.status === 422) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Błąd parametrów workflow: ${error.message || 'Nieprawidłowy repository_id'}`)
    }
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to trigger workflow: ${error.message || response.status}`)
  }

  return true
}

/**
 * Get latest workflow run for sync-jira-on-demand
 */
export async function getLatestWorkflowRun() {
  const token = getToken()
  if (!token) {
    throw new Error('GitHub token not configured')
  }

  const repoInfo = await getRepoInfo()
  if (!repoInfo || !repoInfo.owner || !repoInfo.repo) {
    throw new Error('GitHub repository info not configured')
  }

  const { owner, repo } = repoInfo

  const response = await rateLimitedFetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/actions/workflows/sync-jira-on-demand.yml/runs?per_page=1`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get workflow runs: ${response.status}`)
  }

  const data = await response.json()
  return data.workflow_runs?.[0] || null
}

/**
 * Get workflow run by ID
 */
export async function getWorkflowRun(runId) {
  const token = getToken()
  if (!token) {
    throw new Error('GitHub token not configured')
  }

  const repoInfo = await getRepoInfo()
  if (!repoInfo || !repoInfo.owner || !repoInfo.repo) {
    throw new Error('GitHub repository info not configured')
  }

  const { owner, repo } = repoInfo

  const response = await rateLimitedFetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/actions/runs/${runId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get workflow run: ${response.status}`)
  }

  return response.json()
}

/**
 * Poll workflow status until completion
 */
export async function pollWorkflowStatus(runId, options = {}) {
  const { interval = 5000, timeout = 300000, onStatusChange } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const run = await getWorkflowRun(runId)

    if (onStatusChange) {
      onStatusChange(run)
    }

    // Check if workflow is completed
    if (run.status === 'completed') {
      return {
        success: run.conclusion === 'success',
        conclusion: run.conclusion,
        run
      }
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error('Workflow polling timeout')
}
