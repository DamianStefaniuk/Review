/**
 * Markdown Media Utilities
 *
 * Provides custom markdown rendering with support for media files
 * stored in the GitHub repository. Images and videos are loaded
 * via GitHub API and converted to blob URLs for display.
 */

import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { isMediaPath, isVideoPath, getMediaUrl, clearBlobCache, refreshMediaUrl, hasCachedUrl } from '../services/mediaService'

// Track pending media loads for a given content
const pendingLoads = new Map()

/**
 * Custom renderer for marked that handles media paths
 * Replaces media paths with placeholder elements that will be updated
 * once the blob URLs are loaded
 */
function createMediaRenderer() {
  const renderer = new marked.Renderer()

  // Override image rendering
  renderer.image = function(href, title, text) {
    // Check if this is a media path from our repo
    if (isMediaPath(href)) {
      const isVideo = isVideoPath(href)
      const dataAttr = `data-media-path="${href}"`
      const altText = text || 'media'

      if (isVideo) {
        // Video element with placeholder (no source element - src will be set by processMediaUrls)
        return `<div class="media-container media-loading" ${dataAttr}>
          <video controls class="media-video" data-src="${href}" title="${title || ''}">
            Twoja przeglądarka nie obsługuje video.
          </video>
          <div class="media-placeholder">
            <svg class="w-8 h-8 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-gray-500">Ładowanie video...</span>
          </div>
        </div>`
      } else {
        // Image element with placeholder
        return `<div class="media-container media-loading" ${dataAttr}>
          <img class="media-image" data-src="${href}" alt="${altText}" title="${title || ''}" />
          <div class="media-placeholder">
            <svg class="w-8 h-8 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-sm text-gray-500">Ładowanie...</span>
          </div>
        </div>`
      }
    }

    // Standard image (external URL)
    return `<img src="${href}" alt="${text || ''}" title="${title || ''}" class="media-image" />`
  }

  return renderer
}

/**
 * Render markdown text with media support
 * @param {string} text - Markdown text to render
 * @returns {string} HTML string (sanitized)
 */
export function renderMarkdownWithMedia(text) {
  if (!text) return ''

  marked.setOptions({
    renderer: createMediaRenderer(),
    breaks: true,
    gfm: true
  })

  const html = marked(text)
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-media-path', 'data-src'],
    ADD_TAGS: ['video']
  })
}

/**
 * Process media URLs in a rendered container element
 * Loads blob URLs for media and updates the elements
 * @param {HTMLElement} container - Container element with rendered markdown
 * @returns {Promise<void>}
 */
export async function processMediaUrls(container) {
  if (!container) return

  const mediaContainers = container.querySelectorAll('.media-container[data-media-path]')

  const loadPromises = Array.from(mediaContainers).map(async (mediaDiv) => {
    const path = mediaDiv.getAttribute('data-media-path')
    if (!path) return

    // Check if URL was cached BEFORE fetching (for video retry logic)
    const wasCached = hasCachedUrl(path)

    try {
      const blobUrl = await getMediaUrl(path)

      // Update image or video source
      const img = mediaDiv.querySelector('img[data-src]')
      const video = mediaDiv.querySelector('video[data-src]')

      if (img) {
        img.src = blobUrl
        img.onload = () => {
          mediaDiv.classList.remove('media-loading')
          const placeholder = mediaDiv.querySelector('.media-placeholder')
          if (placeholder) placeholder.remove()
        }
        img.onerror = (event) => {
          console.error(`[Media] Image load error: ${path}`, event)
          mediaDiv.classList.remove('media-loading')
          mediaDiv.classList.add('media-error')
          const placeholder = mediaDiv.querySelector('.media-placeholder')
          if (placeholder) {
            placeholder.innerHTML = `
              <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-red-500">Błąd ładowania obrazu</span>
            `
          }
        }
      }

      if (video) {
        // Remove empty source element that might interfere with loading
        const existingSource = video.querySelector('source')
        if (existingSource) {
          existingSource.remove()
        }

        // Track retry state (wasCached is checked before getMediaUrl call)
        let hasRetried = false

        // Determine video MIME type from path extension
        const videoExt = path.split('.').pop().toLowerCase()
        const videoMimeTypes = {
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'ogg': 'video/ogg',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo'
        }
        const videoType = videoMimeTypes[videoExt] || 'video/mp4'

        const loadVideo = (url) => {
          video.src = url
          // Explicitly trigger loading - required in some browsers after component re-render
          video.load()
        }

        video.onloadeddata = () => {
          mediaDiv.classList.remove('media-loading')
          const placeholder = mediaDiv.querySelector('.media-placeholder')
          if (placeholder) placeholder.remove()
        }

        // Handle error on video element
        const handleVideoError = async () => {
          // If we used a cached URL and haven't retried yet, try refreshing
          if (wasCached && !hasRetried) {
            hasRetried = true
            try {
              const freshUrl = await refreshMediaUrl(path)
              loadVideo(freshUrl)
              return // Don't show error yet, wait for retry result
            } catch (retryError) {
              console.error(`[Media] Video retry failed: ${path}`, retryError)
            }
          }

          // Show error after retry failed or if we didn't use cached URL
          mediaDiv.classList.remove('media-loading')
          mediaDiv.classList.add('media-error')
          const placeholder = mediaDiv.querySelector('.media-placeholder')
          if (placeholder) {
            placeholder.innerHTML = `
              <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-red-500">Błąd ładowania video</span>
            `
          }
        }

        video.onerror = handleVideoError

        loadVideo(blobUrl)
      }
    } catch (error) {
      console.error(`Failed to load media: ${path}`, error)
      mediaDiv.classList.remove('media-loading')
      mediaDiv.classList.add('media-error')
      const placeholder = mediaDiv.querySelector('.media-placeholder')
      if (placeholder) {
        placeholder.innerHTML = `
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm text-red-500">Wymagane zalogowanie</span>
        `
      }
    }
  })

  await Promise.all(loadPromises)
}

/**
 * Generate markdown syntax for uploaded media
 * @param {{ path: string, type: string, fileName: string }} uploadResult - Result from uploadMedia
 * @param {string} altText - Alternative text for the media
 * @returns {string} Markdown string
 */
export function generateMediaMarkdown(uploadResult, altText = '') {
  const { path, type, fileName } = uploadResult
  const alt = altText || fileName || 'media'

  // Use standard image markdown syntax for both images and videos
  // The custom renderer will handle video files based on extension
  return `![${alt}](${path})`
}

/**
 * Vue composable for markdown with media support
 * Handles cleanup of blob URLs when component unmounts
 */
export function useMarkdownMedia() {
  const cleanup = () => {
    clearBlobCache()
  }

  return {
    renderMarkdownWithMedia,
    processMediaUrls,
    generateMediaMarkdown,
    cleanup
  }
}

// Re-export clearBlobCache for manual cleanup if needed
export { clearBlobCache }
