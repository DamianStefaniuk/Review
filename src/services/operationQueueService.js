/**
 * Operation Queue Service
 *
 * Provides:
 * 1. Serialized queue for operations from single browser/user
 * 2. Retry logic with exponential backoff for SHA conflicts
 * 3. Deduplication to prevent duplicate operations
 */

// Configuration
const CONFIG = {
  maxRetries: 7,
  baseDelay: 100,        // ms
  maxDelay: 5000,        // ms
  operationTimeout: 30000, // 30 seconds
  duplicateWindow: 1000,  // 1 second deduplication window
  postOperationDelay: 500 // Delay after each operation to allow GitHub to propagate changes
}

// Priority levels
export const PRIORITY = {
  CRITICAL: 1,  // Close/create sprint
  NORMAL: 2     // Comments, achievements, plans
}

// Queue state
const queue = {
  items: [],
  processing: false,
  currentOp: null
}

// Listeners for status updates
const listeners = new Set()

/**
 * Subscribe to queue status updates
 */
export function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * Notify all listeners of status change
 */
function notifyListeners() {
  const status = getQueueStatus()
  listeners.forEach(callback => callback(status))
}

/**
 * Get current queue status
 */
export function getQueueStatus() {
  return {
    isProcessing: queue.processing,
    currentOperation: queue.currentOp ? {
      id: queue.currentOp.id,
      type: queue.currentOp.type
    } : null,
    queueLength: queue.items.length
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if error is retryable (SHA conflict)
 */
function isRetryableError(error) {
  const message = (error.message || '').toLowerCase()
  return message.includes('409') ||
         message.includes('sha') ||
         message.includes('conflict')
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt) {
  const exponentialDelay = CONFIG.baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 100
  return Math.min(exponentialDelay + jitter, CONFIG.maxDelay)
}

/**
 * Execute operation with retry logic
 */
async function executeWithRetry(operation) {
  let lastError = null

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      // Execute with timeout
      const result = await Promise.race([
        operation.execute(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operacja przekroczyła limit czasu')),
            operation.timeout || CONFIG.operationTimeout)
        )
      ])
      return { success: true, result, attempts: attempt + 1 }
    } catch (error) {
      lastError = error

      // Check if retryable
      if (!isRetryableError(error)) {
        throw error
      }

      if (attempt < CONFIG.maxRetries) {
        // Notify about retry
        if (operation.onRetry) {
          operation.onRetry(attempt + 1, CONFIG.maxRetries)
        }

        // Wait with exponential backoff
        const delay = calculateDelay(attempt)
        await sleep(delay)
      }
    }
  }

  throw new Error(`Nie udało się zapisać po ${CONFIG.maxRetries} próbach: ${lastError?.message || 'Nieznany błąd'}`)
}

/**
 * Process next item in queue
 */
async function processQueue() {
  if (queue.processing || queue.items.length === 0) {
    return
  }

  queue.processing = true
  notifyListeners()

  while (queue.items.length > 0) {
    // Get next operation (sorted by priority)
    const operation = queue.items.shift()
    queue.currentOp = operation
    notifyListeners()

    try {
      const result = await executeWithRetry(operation)
      if (operation.onSuccess) {
        operation.onSuccess(result.result)
      }
      operation.resolve(result.result)

      // Wait after successful operation to allow GitHub to propagate changes
      // This prevents the next operation from fetching stale data
      if (queue.items.length > 0) {
        await sleep(CONFIG.postOperationDelay)
      }
    } catch (error) {
      if (operation.onError) {
        operation.onError(error)
      }
      operation.reject(error)
    }
  }

  queue.currentOp = null
  queue.processing = false
  notifyListeners()
}

/**
 * Check for duplicate operation in queue
 */
function isDuplicate(key) {
  const now = Date.now()
  return queue.items.some(item =>
    item.key === key &&
    (now - item.createdAt) < CONFIG.duplicateWindow
  )
}

/**
 * Enqueue an operation
 * @param {Object} operation - Operation to enqueue
 * @param {string} operation.type - Operation type for logging
 * @param {string} operation.key - Deduplication key
 * @param {number} operation.priority - Priority level (1=critical, 2=normal)
 * @param {Function} operation.execute - Async function to execute
 * @param {Function} [operation.onSuccess] - Success callback
 * @param {Function} [operation.onError] - Error callback
 * @param {Function} [operation.onRetry] - Retry callback (attempt, maxRetries)
 * @param {number} [operation.timeout] - Custom timeout in ms
 * @returns {Promise} - Resolves with operation result
 */
export function enqueue(operation) {
  return new Promise((resolve, reject) => {
    // Check for duplicates
    if (isDuplicate(operation.key)) {
      reject(new Error('Operacja już w trakcie wykonywania'))
      return
    }

    const queueItem = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operation.type,
      key: operation.key,
      priority: operation.priority || PRIORITY.NORMAL,
      execute: operation.execute,
      onSuccess: operation.onSuccess,
      onError: operation.onError,
      onRetry: operation.onRetry,
      timeout: operation.timeout,
      createdAt: Date.now(),
      resolve,
      reject
    }

    // Insert by priority (lower number = higher priority)
    const insertIndex = queue.items.findIndex(item => item.priority > queueItem.priority)
    if (insertIndex === -1) {
      queue.items.push(queueItem)
    } else {
      queue.items.splice(insertIndex, 0, queueItem)
    }

    notifyListeners()

    // Start processing if not already
    processQueue()
  })
}

