/**
 * Rate Limiting Service for GitHub API calls
 *
 * Provides throttling and rate limit tracking for API requests.
 * Uses a simple queue-based limiter without external dependencies.
 */

// Limiter configuration
const LIMITER_CONFIG = {
  maxConcurrent: 2,    // Max 2 concurrent requests
  minTime: 300         // Min 300ms between requests
}

// Request queue
const requestQueue = []
let activeRequests = 0
let lastRequestTime = 0
let isProcessingQueue = false

// Rate limit info from GitHub headers
let rateLimitInfo = {
  remaining: 5000,
  limit: 5000,
  reset: null
}

/**
 * Update rate limit info from response headers
 * @param {Response} response - Fetch response object
 */
export function updateRateLimitFromResponse(response) {
  const remaining = response.headers.get('x-ratelimit-remaining')
  const limit = response.headers.get('x-ratelimit-limit')
  const reset = response.headers.get('x-ratelimit-reset')

  if (remaining) rateLimitInfo.remaining = parseInt(remaining)
  if (limit) rateLimitInfo.limit = parseInt(limit)
  if (reset) rateLimitInfo.reset = new Date(parseInt(reset) * 1000)

  // Warning at low limit (only in development)
  if (rateLimitInfo.remaining < 100 && import.meta.env.DEV) {
    console.warn(`[RateLimit] GitHub API rate limit low: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`)
  }
}

/**
 * Process the request queue
 */
async function processQueue() {
  if (isProcessingQueue) return
  isProcessingQueue = true

  while (requestQueue.length > 0) {
    // Check concurrent limit
    if (activeRequests >= LIMITER_CONFIG.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 50))
      continue
    }

    // Check minimum time between requests
    const timeSinceLastRequest = Date.now() - lastRequestTime
    if (timeSinceLastRequest < LIMITER_CONFIG.minTime) {
      await new Promise(resolve =>
        setTimeout(resolve, LIMITER_CONFIG.minTime - timeSinceLastRequest)
      )
    }

    // Get next request from queue
    const request = requestQueue.shift()
    if (!request) continue

    activeRequests++
    lastRequestTime = Date.now()

    // Execute request
    try {
      const response = await fetch(request.url, request.options)
      updateRateLimitFromResponse(response)
      request.resolve(response)
    } catch (error) {
      request.reject(error)
    } finally {
      activeRequests--
    }
  }

  isProcessingQueue = false
}

/**
 * Rate-limited fetch function
 * Queues requests to respect rate limits
 *
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function rateLimitedFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ url, options, resolve, reject })
    processQueue()
  })
}

