/**
 * Service for sprint management operations
 * Handles closing sprints and creating new ones
 */

import {
  fetchRepoFile,
  updateRepoFile,
  createRepoFile,
  updateCurrentSprintInfoInRepo,
  loadSprintFromRepo
} from './repoDataService'

/**
 * Close a sprint (mark as closed)
 */
export async function closeSprint(sprintId) {
  // Load current sprint data
  const sprintData = await loadSprintFromRepo(sprintId)

  // Update status
  sprintData.status = 'closed'
  sprintData.closedAt = new Date().toISOString()

  // Save updated sprint data (remove internal _sha before saving)
  const sha = sprintData._sha
  delete sprintData._sha
  await updateRepoFile(`sprint-${sprintId}.json`, sprintData, sha)

  // Update current-sprint.json
  await updateCurrentSprintInfoInRepo(sprintId, false)

  return sprintData
}

/**
 * Create a new sprint file with template
 */
export async function createNewSprint(newSprintId, previousSprintData = null) {
  const today = new Date()
  const twoWeeksLater = new Date(today)
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)

  const formatDate = (date) => date.toISOString().split('T')[0]

  const newSprintData = {
    id: newSprintId,
    name: `Sprint ${newSprintId}`,
    status: 'active',
    startDate: formatDate(today),
    endDate: formatDate(twoWeeksLater),
    goals: [],
    achievements: [],
    tasks: [],
    nextSprintPlans: previousSprintData?.nextSprintPlans || '',
    jiraTimelineUrl: previousSprintData?.jiraTimelineUrl || '',
    closedAt: null
  }

  // Create the new sprint file
  await createRepoFile(`sprint-${newSprintId}.json`, newSprintData)

  // Update current-sprint.json
  await updateCurrentSprintInfoInRepo(newSprintId, true)

  return newSprintData
}

/**
 * Close current sprint and create a new one
 */
export async function closeSprintAndCreateNew(currentSprintId) {
  // Close the current sprint
  const closedSprint = await closeSprint(currentSprintId)

  // Create new sprint with ID + 1
  const newSprintId = currentSprintId + 1
  const newSprint = await createNewSprint(newSprintId, closedSprint)

  return {
    closedSprint,
    newSprint
  }
}

/**
 * Get sprint status
 */
export async function getSprintStatus(sprintId) {
  try {
    const sprintData = await loadSprintFromRepo(sprintId)
    return {
      exists: true,
      status: sprintData.status,
      closedAt: sprintData.closedAt
    }
  } catch {
    return {
      exists: false,
      status: null,
      closedAt: null
    }
  }
}

/**
 * Check if sprint can be closed
 */
export async function canCloseSprint(sprintId) {
  const status = await getSprintStatus(sprintId)
  return status.exists && status.status === 'active'
}
