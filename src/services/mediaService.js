/**
 * Media Service for handling media uploads and fetching from GitHub
 * Supports images (jpg, png, gif, webp) and videos (mp4, webm)
 *
 * Media files are stored in: media/sprint-{id}/ directory
 */

import {
  getRepoConfig,
  fetchBinaryFile,
  uploadBinaryFile,
  listDirectoryContents,
  deleteRepoFile,
  fetchRepoFile,
  updateRepoFile
} from './repoDataService'

// File type configurations
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

// Size limits in bytes
const IMAGE_MAX_SIZE = 10 * 1024 * 1024  // 10MB
const VIDEO_MAX_SIZE = 50 * 1024 * 1024  // 50MB

// Cache for blob URLs to avoid refetching
const blobUrlCache = new Map()

/**
 * Validate file type and size
 * @param {File} file - File to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'Nie wybrano pliku' }
  }

  // Check type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Nieobsługiwany typ pliku. Dozwolone: jpg, png, gif, webp, mp4, webm`
    }
  }

  // Check size based on type
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
  const maxSize = isVideo ? VIDEO_MAX_SIZE : IMAGE_MAX_SIZE
  const maxSizeMB = maxSize / (1024 * 1024)

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Plik jest za duży. Maksymalny rozmiar: ${maxSizeMB}MB`
    }
  }

  return { valid: true }
}

/**
 * Get file type category (image or video)
 * @param {File|string} fileOrType - File object or MIME type string
 * @returns {'image' | 'video' | null}
 */
export function getFileCategory(fileOrType) {
  const type = typeof fileOrType === 'string' ? fileOrType : fileOrType?.type
  if (ALLOWED_IMAGE_TYPES.includes(type)) return 'image'
  if (ALLOWED_VIDEO_TYPES.includes(type)) return 'video'
  return null
}

/**
 * Convert file to base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} Base64 encoded content (without data URL prefix)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Błąd odczytu pliku'))
    reader.readAsDataURL(file)
  })
}

/**
 * Sanitize filename - remove special characters that could cause issues
 * @param {string} name - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFileName(name) {
  // Remove path separators and special characters, keep letters, numbers, dots, hyphens, underscores
  return name
    .replace(/[/\\:*?"<>|]/g, '') // Remove invalid file characters
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/[^\w.\-]/g, '')      // Remove other special characters (keep word chars, dots, hyphens)
    .replace(/\.+/g, '.')          // Remove multiple consecutive dots
    .replace(/^\.+|\.+$/g, '')     // Remove leading/trailing dots
}

/**
 * Generate unique filename for media - keeps original name with timestamp prefix
 * @param {string} originalName - Original file name
 * @param {number|string} sprintId - Sprint ID
 * @returns {string} Generated filename
 */
export function generateFileName(originalName, sprintId) {
  const timestamp = Date.now()

  // Get the original filename without extension
  const parts = originalName.split('.')
  const extension = parts.pop().toLowerCase()
  const nameWithoutExt = parts.join('.')

  // Sanitize the original name
  const sanitizedName = sanitizeFileName(nameWithoutExt)

  // If sanitized name is empty, use a generic name
  const baseName = sanitizedName || 'media'

  // Return: timestamp_originalname.ext
  return `${timestamp}_${baseName}.${extension}`
}

/**
 * Get the media path for a sprint
 * @param {number|string} sprintId - Sprint ID
 * @param {string} fileName - File name
 * @returns {string} Full path in repository
 */
export function getMediaPath(sprintId, fileName) {
  return `media/sprint-${sprintId}/${fileName}`
}

/**
 * Upload media file to GitHub repository
 * @param {number|string} sprintId - Sprint ID
 * @param {File} file - File to upload
 * @param {(progress: number) => void} onProgress - Progress callback (0-100)
 * @returns {Promise<{ path: string, type: string, fileName: string }>}
 */
export async function uploadMedia(sprintId, file, onProgress = () => {}) {
  const config = await getRepoConfig()
  if (!config) {
    throw new Error('Nie zalogowano - wymagana autoryzacja')
  }

  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  onProgress(10)

  // Convert to base64
  const base64Content = await fileToBase64(file)
  onProgress(40)

  // Generate unique filename
  const fileName = generateFileName(file.name, sprintId)
  const path = getMediaPath(sprintId, fileName)

  // Upload to GitHub using repoDataService
  await uploadBinaryFile(path, base64Content, `Upload media: ${fileName}`)

  onProgress(100)

  return {
    path,
    type: getFileCategory(file),
    fileName
  }
}

/**
 * Fetch media file from GitHub and return as Blob
 * @param {string} path - Path to media file in repository
 * @returns {Promise<Blob>}
 */
export async function fetchMediaBlob(path) {
  // Use repoDataService which handles auth and decoding
  return fetchBinaryFile(path)
}

/**
 * Get the correct MIME type for a file path
 * @param {string} path - File path
 * @returns {string} MIME type
 */
function getMimeTypeForPath(path) {
  const extension = path.split('.').pop().toLowerCase()
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'mov': 'video/quicktime'
  }
  return mimeTypes[extension] || 'application/octet-stream'
}

/**
 * Get blob URL for media, with caching
 * @param {string} path - Path to media file in repository
 * @returns {Promise<string>} Blob URL
 */
export async function getMediaUrl(path) {
  // Check cache first
  if (blobUrlCache.has(path)) {
    return blobUrlCache.get(path)
  }

  let blob = await fetchMediaBlob(path)

  // Ensure blob has correct MIME type (fix for video playback issues)
  const expectedType = getMimeTypeForPath(path)
  if (!blob.type || blob.type === 'application/octet-stream' || blob.type !== expectedType) {
    console.log(`[Media] Fixing blob type from "${blob.type}" to "${expectedType}" for ${path}`)
    const arrayBuffer = await blob.arrayBuffer()
    blob = new Blob([arrayBuffer], { type: expectedType })
  }

  const blobUrl = URL.createObjectURL(blob)

  // Cache the URL
  blobUrlCache.set(path, blobUrl)

  return blobUrl
}

/**
 * Check if a path is a media path
 * @param {string} path - Path to check
 * @returns {boolean}
 */
export function isMediaPath(path) {
  if (!path) return false
  return path.startsWith('media/sprint-')
}

/**
 * Check if path is a video file
 * @param {string} path - Path to check
 * @returns {boolean}
 */
export function isVideoPath(path) {
  if (!path) return false
  const extension = path.split('.').pop().toLowerCase()
  return ['mp4', 'webm'].includes(extension)
}

/**
 * Clear blob URL cache (call when component unmounts to free memory)
 */
export function clearBlobCache() {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url)
  }
  blobUrlCache.clear()
}

/**
 * Revoke a specific blob URL from cache
 * @param {string} path - Path of the media
 */
export function revokeBlobUrl(path) {
  if (blobUrlCache.has(path)) {
    URL.revokeObjectURL(blobUrlCache.get(path))
    blobUrlCache.delete(path)
  }
}

/**
 * Force refresh a media URL - invalidate cache and fetch fresh
 * @param {string} path - Path to media file in repository
 * @returns {Promise<string>} Fresh blob URL
 */
export async function refreshMediaUrl(path) {
  // Revoke old URL if cached
  revokeBlobUrl(path)

  // Fetch fresh
  let blob = await fetchMediaBlob(path)

  // Ensure blob has correct MIME type
  const expectedType = getMimeTypeForPath(path)
  if (!blob.type || blob.type === 'application/octet-stream' || blob.type !== expectedType) {
    console.log(`[Media] Fixing blob type from "${blob.type}" to "${expectedType}" for ${path}`)
    const arrayBuffer = await blob.arrayBuffer()
    blob = new Blob([arrayBuffer], { type: expectedType })
  }

  const blobUrl = URL.createObjectURL(blob)

  // Cache the new URL
  blobUrlCache.set(path, blobUrl)

  return blobUrl
}

/**
 * Check if a path has a cached blob URL
 * @param {string} path - Path to check
 * @returns {boolean}
 */
export function hasCachedUrl(path) {
  return blobUrlCache.has(path)
}

/**
 * List all media files for a specific sprint
 * @param {number|string} sprintId - Sprint ID
 * @returns {Promise<Array<{name: string, path: string, sha: string, size: number, displayName: string, timestamp: number, extension: string, type: string}>>}
 */
export async function listMediaForSprint(sprintId) {
  const dirPath = `media/sprint-${sprintId}`

  try {
    const files = await listDirectoryContents(dirPath)
    return files
      .filter(f => f.type === 'file')
      .map(f => {
        const ext = f.name.split('.').pop().toLowerCase()
        const nameWithoutExt = f.name.substring(0, f.name.lastIndexOf('.'))

        // Try to extract timestamp and display name
        // Format 1: timestamp_name (e.g., 1234567890_myfile)
        // Format 2: timestamp-id (e.g., 1234567890-abc123)
        // Format 3: just filename
        let timestamp = 0
        let displayName = nameWithoutExt

        const underscoreMatch = nameWithoutExt.match(/^(\d{10,})_(.+)$/)
        const dashMatch = nameWithoutExt.match(/^(\d{10,})-(.+)$/)

        if (underscoreMatch) {
          timestamp = parseInt(underscoreMatch[1], 10)
          displayName = underscoreMatch[2]
        } else if (dashMatch) {
          timestamp = parseInt(dashMatch[1], 10)
          displayName = dashMatch[2]
        } else {
          // Try to extract any leading timestamp
          const leadingTimestamp = nameWithoutExt.match(/^(\d{10,})/)
          if (leadingTimestamp) {
            timestamp = parseInt(leadingTimestamp[1], 10)
          }
        }

        return {
          name: f.name,
          path: f.path,
          sha: f.sha,
          size: f.size,
          displayName,
          timestamp,
          extension: ext,
          type: ['mp4', 'webm'].includes(ext) ? 'video' : 'image'
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    if (error.message.includes('404')) return []
    throw error
  }
}

/**
 * Delete a media file
 * @param {string} path - Path to the media file
 * @param {string} sha - SHA of the file to delete
 * @returns {Promise<void>}
 */
export async function deleteMedia(path, sha) {
  revokeBlobUrl(path)
  await deleteRepoFile(path, sha)
}

/**
 * Rename a media file (download, upload with new name, delete old)
 * @param {string} oldPath - Current path of the media
 * @param {string} newDisplayName - New display name (without timestamp and extension)
 * @param {number|string} sprintId - Sprint ID
 * @param {string} oldSha - SHA of the current file
 * @returns {Promise<{path: string, sha: string}>}
 */
export async function renameMedia(oldPath, newDisplayName, sprintId, oldSha) {
  // Extract extension from original file
  const ext = oldPath.split('.').pop().toLowerCase()

  // Extract timestamp from filename (format: timestamp_name.ext or timestamp-id.ext)
  const oldFileName = oldPath.split('/').pop()
  const oldNameWithoutExt = oldFileName.substring(0, oldFileName.lastIndexOf('.'))

  // Try to extract timestamp (first numeric part before _ or -)
  const timestampMatch = oldNameWithoutExt.match(/^(\d+)/)
  const timestamp = timestampMatch ? timestampMatch[1] : Date.now().toString()

  // Strip extension from user input if they included it
  let cleanName = newDisplayName
  const userExtMatch = newDisplayName.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i)
  if (userExtMatch) {
    cleanName = newDisplayName.substring(0, newDisplayName.lastIndexOf('.'))
  }

  // Sanitize the name
  const sanitized = cleanName.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_') || 'media'
  const newPath = `media/sprint-${sprintId}/${timestamp}_${sanitized}.${ext}`

  if (oldPath === newPath) return { path: oldPath, sha: oldSha }

  const blob = await fetchMediaBlob(oldPath)
  const base64 = btoa(new Uint8Array(await blob.arrayBuffer()).reduce((d, b) => d + String.fromCharCode(b), ''))

  const result = await uploadBinaryFile(newPath, base64, `Rename media`)
  await deleteRepoFile(oldPath, oldSha)
  revokeBlobUrl(oldPath)

  return { path: newPath, sha: result.sha }
}

/**
 * Find and update all references to a media path in sprint data
 * Searches through achievements, nextSprintPlans, and all comments
 * @param {number|string} sprintId - Sprint ID
 * @param {string} oldPath - Old media path to find
 * @param {string} newPath - New media path to replace with
 * @returns {Promise<{updated: boolean, count: number}>} - Whether any updates were made and count of replacements
 */
export async function updateMediaReferencesInSprint(sprintId, oldPath, newPath) {
  const filename = `sprint-${sprintId}.json`
  const result = await fetchRepoFile(filename)

  if (!result) {
    return { updated: false, count: 0 }
  }

  const sprintData = result.content
  let totalReplacements = 0

  // Helper function to replace path in a string
  const replacePath = (text) => {
    if (!text || typeof text !== 'string') return { text, count: 0 }
    // Escape special regex characters in the path
    const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedOldPath, 'g')
    const matches = text.match(regex)
    const count = matches ? matches.length : 0
    return {
      text: text.replace(regex, newPath),
      count
    }
  }

  // Update achievements
  if (sprintData.achievements) {
    const { text, count } = replacePath(sprintData.achievements)
    sprintData.achievements = text
    totalReplacements += count
  }

  // Update nextSprintPlans
  if (sprintData.nextSprintPlans) {
    const { text, count } = replacePath(sprintData.nextSprintPlans)
    sprintData.nextSprintPlans = text
    totalReplacements += count
  }

  // Update goal comments
  if (sprintData.goals && Array.isArray(sprintData.goals)) {
    for (const goal of sprintData.goals) {
      if (goal.comments && Array.isArray(goal.comments)) {
        for (const comment of goal.comments) {
          if (comment.text) {
            const { text, count } = replacePath(comment.text)
            comment.text = text
            totalReplacements += count
          }
        }
      }
    }
  }

  // Update side goal comments
  if (sprintData.sideGoals && Array.isArray(sprintData.sideGoals)) {
    for (const goal of sprintData.sideGoals) {
      if (goal.comments && Array.isArray(goal.comments)) {
        for (const comment of goal.comments) {
          if (comment.text) {
            const { text, count } = replacePath(comment.text)
            comment.text = text
            totalReplacements += count
          }
        }
      }
    }
  }

  // Save if any changes were made
  if (totalReplacements > 0) {
    delete sprintData._sha
    await updateRepoFile(filename, sprintData, result.sha)
    return { updated: true, count: totalReplacements }
  }

  return { updated: false, count: 0 }
}
