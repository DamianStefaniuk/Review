/**
 * Media Service for handling media uploads and fetching from GitHub
 * Supports images (jpg, png, gif, webp) and videos (mp4, webm)
 *
 * Media files are stored in: media/sprint-{id}/ directory
 */

import { getRepoConfig, fetchBinaryFile, uploadBinaryFile } from './repoDataService'

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
 * Get blob URL for media, with caching
 * @param {string} path - Path to media file in repository
 * @returns {Promise<string>} Blob URL
 */
export async function getMediaUrl(path) {
  // Check cache first
  if (blobUrlCache.has(path)) {
    return blobUrlCache.get(path)
  }

  const blob = await fetchMediaBlob(path)
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
 * List all media files for a specific sprint
 * @param {number|string} sprintId - Sprint ID
 * @returns {Promise<Array<{name: string, path: string, sha: string, size: number, displayName: string, timestamp: number, extension: string, type: string}>>}
 */
export async function listMediaForSprint(sprintId) {
  const { listDirectoryContents } = await import('./repoDataService')
  const dirPath = `media/sprint-${sprintId}`

  try {
    const files = await listDirectoryContents(dirPath)
    return files
      .filter(f => f.type === 'file')
      .map(f => {
        const ext = f.name.split('.').pop().toLowerCase()
        const nameWithoutExt = f.name.substring(0, f.name.lastIndexOf('.'))
        const [timestampStr, ...nameParts] = nameWithoutExt.split('_')
        return {
          name: f.name,
          path: f.path,
          sha: f.sha,
          size: f.size,
          displayName: nameParts.join('_') || f.name,
          timestamp: parseInt(timestampStr, 10) || 0,
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
  const { deleteRepoFile } = await import('./repoDataService')
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
  const { uploadBinaryFile, deleteRepoFile } = await import('./repoDataService')

  const ext = oldPath.split('.').pop()
  const oldTimestamp = oldPath.split('/').pop().split('_')[0]
  const sanitized = newDisplayName.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_') || 'media'
  const newPath = `media/sprint-${sprintId}/${oldTimestamp}_${sanitized}.${ext}`

  if (oldPath === newPath) return { path: oldPath, sha: oldSha }

  const blob = await fetchMediaBlob(oldPath)
  const base64 = btoa(new Uint8Array(await blob.arrayBuffer()).reduce((d, b) => d + String.fromCharCode(b), ''))

  const result = await uploadBinaryFile(newPath, base64, `Rename media`)
  await deleteRepoFile(oldPath, oldSha)
  revokeBlobUrl(oldPath)

  return { path: newPath, sha: result.sha }
}
