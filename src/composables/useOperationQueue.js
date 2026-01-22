/**
 * Vue Composable for Operation Queue
 *
 * Provides reactive queue status and convenience methods for common operations
 */

import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { enqueue, subscribe, getQueueStatus, PRIORITY } from '../services/operationQueueService'
import {
  fetchRepoFile,
  updateRepoFile,
  createRepoFile,
  fetchRootFile,
  updateRootFile,
  loadSprintFromRepo
} from '../services/repoDataService'

export function useOperationQueue() {
  // Reactive state
  const isProcessing = ref(false)
  const currentOperation = ref(null)
  const queueLength = ref(0)
  const lastError = ref(null)
  const retryInfo = ref(null)

  // Subscribe to queue status updates
  let unsubscribe = null

  onMounted(() => {
    const updateStatus = (status) => {
      isProcessing.value = status.isProcessing
      currentOperation.value = status.currentOperation
      queueLength.value = status.queueLength
    }

    // Initial status
    updateStatus(getQueueStatus())

    // Subscribe to updates
    unsubscribe = subscribe(updateStatus)
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  /**
   * Generic queue operation wrapper
   */
  async function queueOperation(options) {
    lastError.value = null
    retryInfo.value = null

    try {
      const result = await enqueue({
        ...options,
        onRetry: (attempt, maxRetries) => {
          retryInfo.value = { attempt, maxRetries }
          if (options.onRetry) {
            options.onRetry(attempt, maxRetries)
          }
        },
        onSuccess: (result) => {
          retryInfo.value = null
          if (options.onSuccess) {
            options.onSuccess(result)
          }
        },
        onError: (error) => {
          lastError.value = error
          retryInfo.value = null
          if (options.onError) {
            options.onError(error)
          }
        }
      })
      return result
    } catch (error) {
      lastError.value = error
      throw error
    }
  }

  // ==========================================
  // Comment Operations
  // ==========================================

  async function queueAddComment(sprintId, goalId, comment, isSideGoal = false, callbacks = {}) {
    return queueOperation({
      type: 'addComment',
      key: `comment-add-${sprintId}-${goalId}-${comment.id}`,
      priority: PRIORITY.NORMAL,
      execute: async () => {
        const filename = `sprint-${sprintId}.json`
        const result = await fetchRepoFile(filename)

        if (!result) {
          throw new Error(`Sprint ${sprintId} nie znaleziony`)
        }

        const sprintData = result.content
        const goal = isSideGoal
          ? sprintData.sideGoals?.find(g => g.id === goalId)
          : sprintData.goals.find(g => g.id === goalId)

        if (!goal) {
          throw new Error(`Cel ${goalId} nie znaleziony`)
        }

        if (!goal.comments) {
          goal.comments = []
        }

        // Check if comment already exists (avoid duplicates on retry)
        if (!goal.comments.some(c => c.id === comment.id)) {
          goal.comments.unshift(comment)
        }

        await updateRepoFile(filename, sprintData, result.sha)
        return true
      },
      ...callbacks
    })
  }

  async function queueUpdateComment(sprintId, goalId, commentId, updatedComment, isSideGoal = false, callbacks = {}) {
    return queueOperation({
      type: 'updateComment',
      key: `comment-update-${sprintId}-${goalId}-${commentId}`,
      priority: PRIORITY.NORMAL,
      execute: async () => {
        const filename = `sprint-${sprintId}.json`
        const result = await fetchRepoFile(filename)

        if (!result) {
          throw new Error(`Sprint ${sprintId} nie znaleziony`)
        }

        const sprintData = result.content
        const goal = isSideGoal
          ? sprintData.sideGoals?.find(g => g.id === goalId)
          : sprintData.goals.find(g => g.id === goalId)

        if (!goal) {
          throw new Error(`Cel ${goalId} nie znaleziony`)
        }

        const commentIndex = goal.comments?.findIndex(c => c.id === commentId)
        if (commentIndex === -1 || commentIndex === undefined) {
          throw new Error(`Komentarz ${commentId} nie znaleziony`)
        }

        goal.comments[commentIndex] = {
          ...goal.comments[commentIndex],
          text: updatedComment.text,
          author: updatedComment.author,
          updatedAt: new Date().toISOString()
        }

        await updateRepoFile(filename, sprintData, result.sha)
        return true
      },
      ...callbacks
    })
  }

  async function queueDeleteComment(sprintId, goalId, commentId, isSideGoal = false, callbacks = {}) {
    return queueOperation({
      type: 'deleteComment',
      key: `comment-delete-${sprintId}-${goalId}-${commentId}`,
      priority: PRIORITY.NORMAL,
      execute: async () => {
        const filename = `sprint-${sprintId}.json`
        const result = await fetchRepoFile(filename)

        if (!result) {
          throw new Error(`Sprint ${sprintId} nie znaleziony`)
        }

        const sprintData = result.content
        const goal = isSideGoal
          ? sprintData.sideGoals?.find(g => g.id === goalId)
          : sprintData.goals.find(g => g.id === goalId)

        if (!goal) {
          throw new Error(`Cel ${goalId} nie znaleziony`)
        }

        const commentIndex = goal.comments?.findIndex(c => c.id === commentId)
        if (commentIndex === -1 || commentIndex === undefined) {
          // Already deleted - success
          return true
        }

        goal.comments.splice(commentIndex, 1)
        await updateRepoFile(filename, sprintData, result.sha)
        return true
      },
      ...callbacks
    })
  }

  // ==========================================
  // Achievements & Next Sprint Plans
  // ==========================================

  async function queueSaveAchievements(sprintId, content, callbacks = {}) {
    return queueOperation({
      type: 'saveAchievements',
      key: `achievements-${sprintId}`,
      priority: PRIORITY.NORMAL,
      execute: async () => {
        const filename = `sprint-${sprintId}.json`
        const result = await fetchRepoFile(filename)

        if (!result) {
          throw new Error(`Sprint ${sprintId} nie znaleziony`)
        }

        const sprintData = result.content
        sprintData.achievements = content
        delete sprintData._sha

        await updateRepoFile(filename, sprintData, result.sha)
        return true
      },
      ...callbacks
    })
  }

  async function queueSaveNextSprintPlans(sprintId, content, callbacks = {}) {
    return queueOperation({
      type: 'saveNextSprintPlans',
      key: `nextSprintPlans-${sprintId}`,
      priority: PRIORITY.NORMAL,
      execute: async () => {
        const filename = `sprint-${sprintId}.json`
        const result = await fetchRepoFile(filename)

        if (!result) {
          throw new Error(`Sprint ${sprintId} nie znaleziony`)
        }

        const sprintData = result.content
        sprintData.nextSprintPlans = content
        delete sprintData._sha

        await updateRepoFile(filename, sprintData, result.sha)
        return true
      },
      ...callbacks
    })
  }

  // ==========================================
  // Sprint Lifecycle Operations
  // ==========================================

  async function queueCloseSprint(sprintId, createNew = true, callbacks = {}) {
    return queueOperation({
      type: 'closeSprint',
      key: `closeSprint-${sprintId}`,
      priority: PRIORITY.CRITICAL,
      timeout: 60000, // 60 seconds for critical operations
      execute: async () => {
        // Step 1: Load and close sprint
        const filename = `sprint-${sprintId}.json`
        const result = await fetchRepoFile(filename)

        if (!result) {
          throw new Error(`Sprint ${sprintId} nie znaleziony`)
        }

        const sprintData = result.content
        sprintData.status = 'closed'
        sprintData.closedAt = new Date().toISOString()

        await updateRepoFile(filename, sprintData, result.sha)

        // Step 2: Update current-sprint.json (mark as inactive)
        const currentSprintResult = await fetchRootFile('current-sprint.json')
        await updateRootFile('current-sprint.json', {
          currentSprintId: sprintId,
          isActive: false
        }, currentSprintResult?.sha)

        let newSprint = null

        // Step 3: Create new sprint if requested
        if (createNew) {
          const newSprintId = sprintId + 1
          const today = new Date()
          const twoWeeksLater = new Date(today)
          twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)

          const formatDate = (date) => date.toISOString().split('T')[0]

          newSprint = {
            id: newSprintId,
            name: `Sprint ${newSprintId}`,
            status: 'active',
            startDate: formatDate(today),
            endDate: formatDate(twoWeeksLater),
            goals: [],
            sideGoals: [],
            achievements: '',
            tasks: [],
            nextSprintPlans: sprintData.nextSprintPlans || '',
            jiraTimelineUrl: sprintData.jiraTimelineUrl || '',
            jiraBaseUrl: sprintData.jiraBaseUrl || '',
            closedAt: null
          }

          // Create new sprint file
          await createRepoFile(`sprint-${newSprintId}.json`, newSprint)

          // Update current-sprint.json to point to new sprint
          const currentSprintResult2 = await fetchRootFile('current-sprint.json')
          await updateRootFile('current-sprint.json', {
            currentSprintId: newSprintId,
            isActive: true
          }, currentSprintResult2?.sha)
        }

        return {
          closedSprint: sprintData,
          newSprint
        }
      },
      ...callbacks
    })
  }

  return {
    // Reactive state (readonly)
    isProcessing: readonly(isProcessing),
    currentOperation: readonly(currentOperation),
    queueLength: readonly(queueLength),
    lastError: readonly(lastError),
    retryInfo: readonly(retryInfo),

    // Generic operation
    queueOperation,

    // Comment operations
    queueAddComment,
    queueUpdateComment,
    queueDeleteComment,

    // Content operations
    queueSaveAchievements,
    queueSaveNextSprintPlans,

    // Sprint lifecycle
    queueCloseSprint
  }
}
