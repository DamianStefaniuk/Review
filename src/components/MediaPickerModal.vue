<script setup>
import { ref, onMounted } from 'vue'
import { listMediaForSprint, getMediaUrl } from '../services/mediaService'
import { generateMediaMarkdown } from '../utils/markdownMedia'

const props = defineProps({
  sprintId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['select', 'close'])

const mediaList = ref([])
const loading = ref(true)
const error = ref(null)
const loadedUrls = ref(new Map())

// Load media list
const loadMedia = async () => {
  loading.value = true
  error.value = null

  try {
    mediaList.value = await listMediaForSprint(props.sprintId)
  } catch (err) {
    console.error('Error loading media list:', err)
    error.value = 'Nie udało się załadować listy mediów'
    mediaList.value = []
  } finally {
    loading.value = false
  }
}

// Load thumbnail URL for a media item
const loadThumbnail = async (media) => {
  if (loadedUrls.value.has(media.path)) return

  try {
    const url = await getMediaUrl(media.path)
    loadedUrls.value.set(media.path, url)
  } catch (err) {
    console.error('Error loading thumbnail:', media.path, err)
    loadedUrls.value.set(media.path, null)
  }
}

// Get thumbnail URL from cache
const getThumbnailUrl = (media) => {
  return loadedUrls.value.get(media.path) || null
}

// Handle media selection
const handleSelect = (media) => {
  const result = {
    path: media.path,
    type: media.type,
    fileName: media.name
  }
  const markdown = generateMediaMarkdown(result, media.displayName)

  emit('select', {
    media: result,
    markdown
  })
}

// Handle close
const handleClose = () => {
  emit('close')
}

// Close on escape key
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    handleClose()
  }
}

// Load media and thumbnails on mount
onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  await loadMedia()

  // Load thumbnails for visible items
  for (const media of mediaList.value.slice(0, 20)) {
    loadThumbnail(media)
  }
})

// Cleanup
import { onUnmounted } from 'vue'
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Format file size
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Format date from timestamp
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black bg-opacity-50"
      @click="handleClose"
    ></div>

    <!-- Modal -->
    <div class="relative bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Wybierz media</h3>
        <button
          @click="handleClose"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <svg class="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-12">
          <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-gray-600">{{ error }}</p>
          <button
            @click="loadMedia"
            class="mt-4 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Spróbuj ponownie
          </button>
        </div>

        <!-- Empty state -->
        <div v-else-if="mediaList.length === 0" class="text-center py-12">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-gray-600">Brak mediów w tym sprincie</p>
          <p class="text-sm text-gray-500 mt-1">Dodaj media korzystając z przycisku upload</p>
        </div>

        <!-- Media grid -->
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-4">
          <button
            v-for="media in mediaList"
            :key="media.path"
            @click="handleSelect(media)"
            @mouseenter="loadThumbnail(media)"
            class="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
          >
            <!-- Thumbnail for images -->
            <template v-if="media.type === 'image'">
              <img
                v-if="getThumbnailUrl(media)"
                :src="getThumbnailUrl(media)"
                :alt="media.displayName"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </template>

            <!-- Video thumbnail -->
            <template v-else>
              <video
                v-if="getThumbnailUrl(media)"
                :src="getThumbnailUrl(media)"
                class="w-full h-full object-cover"
                muted
                preload="metadata"
              ></video>
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <!-- Video badge -->
              <div class="absolute top-2 right-2 px-1.5 py-0.5 bg-black bg-opacity-60 rounded text-white text-xs font-medium">
                {{ media.extension.toUpperCase() }}
              </div>
            </template>

            <!-- Hover overlay with info -->
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-end">
              <div class="w-full p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="text-white text-xs truncate font-medium">{{ media.displayName }}</p>
                <p class="text-gray-300 text-xs">{{ formatSize(media.size) }}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200">
        <button
          @click="handleClose"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Anuluj
        </button>
      </div>
    </div>
  </div>
</template>
