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
  fetchRootFile,
  updateRootFile,
  uploadBinaryFile
} from '../services/repoDataService'
import {
  validateFile,
  fileToBase64,
  generateFileName,
  getMediaPath,
  getFileCategory,
  deleteMedia,
  renameMedia,
  updateMediaReferencesInSprint
} from '../services/mediaService'

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
  // Media Upload Operations
  // ==========================================

  async function queueMediaUpload(sprintId, file, callbacks = {}) {
    // Validate file before queuing
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const fileName = generateFileName(file.name, sprintId)
    const path = getMediaPath(sprintId, fileName)

    return queueOperation({
      type: 'mediaUpload',
      key: `media-upload-${sprintId}-${fileName}`,
      priority: PRIORITY.NORMAL,
      timeout: 120000, // 120 seconds for large files
      execute: async () => {
        // Convert file to base64
        const base64Content = await fileToBase64(file)

        // Upload to GitHub
        await uploadBinaryFile(path, base64Content, `Upload media: ${fileName}`)

        return {
          path,
          type: getFileCategory(file),
          fileName
        }
      },
      ...callbacks
    })
  }

  // ==========================================
  // Sprint Lifecycle Operations
  // ==========================================

  async function queueCloseSprint(sprintId, callbacks = {}) {
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

        return { closedSprint: sprintData }
      },
      ...callbacks
    })
  }

  async function queueReopenSprint(sprintId, callbacks = {}) {
    return queueOperation({
      type: 'reopenSprint',
      key: `reopenSprint-${sprintId}`,
      priority: PRIORITY.CRITICAL,
      timeout: 60000,
      execute: async () => {
        // 1. Load and reopen sprint
        const filename = `sprint-${sprintId}.json`
        const result = await fetchRepoFile(filename)

        if (!result) {
          throw new Error(`Sprint ${sprintId} nie znaleziony`)
        }

        const sprintData = result.content

        // Validate - sprint must be closed
        if (sprintData.status !== 'closed') {
          throw new Error(`Sprint ${sprintId} nie jest zamknięty`)
        }

        // Revert closing
        sprintData.status = 'active'
        sprintData.closedAt = null

        await updateRepoFile(filename, sprintData, result.sha)

        // 2. Update current-sprint.json
        const currentSprintResult = await fetchRootFile('current-sprint.json')
        await updateRootFile('current-sprint.json', {
          currentSprintId: sprintId,
          isActive: true
        }, currentSprintResult?.sha)

        return { reopenedSprint: sprintData }
      },
      ...callbacks
    })
  }

  // ==========================================
  // Media Delete & Rename Operations
  // ==========================================

  async function queueDeleteMedia(path, sha, callbacks = {}) {
    return queueOperation({
      type: 'deleteMedia',
      key: `media-delete-${path}`,
      priority: PRIORITY.NORMAL,
      execute: async () => {
        await deleteMedia(path, sha)
        return { path }
      },
      ...callbacks
    })
  }

  async function queueRenameMedia(oldPath, newDisplayName, sprintId, oldSha, callbacks = {}) {
    return queueOperation({
      type: 'renameMedia',
      key: `media-rename-${oldPath}`,
      priority: PRIORITY.NORMAL,
      timeout: 120000, // 120 seconds for download/upload
      execute: async () => {
        // First rename the file
        const result = await renameMedia(oldPath, newDisplayName, sprintId, oldSha)

        // Then update all references in sprint data (achievements, nextSprintPlans, comments)
        if (result.path !== oldPath) {
          const refResult = await updateMediaReferencesInSprint(sprintId, oldPath, result.path)
          return { ...result, referencesUpdated: refResult.count }
        }

        return { ...result, referencesUpdated: 0 }
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

    // Media operations
    queueMediaUpload,
    queueDeleteMedia,
    queueRenameMedia,

    // Sprint lifecycle
    queueCloseSprint,
    queueReopenSprint
  }
}
