<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { listMediaForSprint, getMediaUrl, clearBlobCache } from '../services/mediaService'
import { useOperationQueue } from '../composables/useOperationQueue'
import MediaUploader from './MediaUploader.vue'

const props = defineProps({
  sprintId: {
    type: [Number, String],
    required: true
  },
  isSprintActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['sprint-updated'])

const { queueDeleteMedia, queueRenameMedia } = useOperationQueue()

// State
const mediaList = ref([])
const loading = ref(true)
const error = ref(null)
const viewMode = ref('grid') // 'grid' or 'list'

// Preview modal state
const previewMedia = ref(null)
const previewUrl = ref(null)

// Edit state
const editingMedia = ref(null)
const editName = ref('')

// Delete confirmation state
const deletingMedia = ref(null)
const deleteLoading = ref(false)

// Rename loading state
const renameLoading = ref(false)

// Success message state
const successMessage = ref(null)
const successTimeout = ref(null)

const showSuccess = (message) => {
  if (successTimeout.value) clearTimeout(successTimeout.value)
  successMessage.value = message
  successTimeout.value = setTimeout(() => {
    successMessage.value = null
  }, 4000)
}

// Computed
const mediaCount = computed(() => mediaList.value.length)

// Load media list
const loadMedia = async () => {
  loading.value = true
  error.value = null

  try {
    mediaList.value = await listMediaForSprint(props.sprintId)
  } catch (err) {
    console.error('Failed to load media:', err)
    error.value = 'Nie udało się załadować mediów'
  } finally {
    loading.value = false
  }
}

// Open preview modal
const openPreview = async (media) => {
  previewMedia.value = media
  try {
    previewUrl.value = await getMediaUrl(media.path)
  } catch (err) {
    console.error('Failed to load preview:', err)
  }
}

// Close preview modal
const closePreview = () => {
  previewMedia.value = null
  previewUrl.value = null
}

// Start editing name
const startEdit = (media) => {
  editingMedia.value = media
  editName.value = media.displayName
}

// Cancel editing
const cancelEdit = () => {
  editingMedia.value = null
  editName.value = ''
}

// Save edited name
const saveEdit = async () => {
  if (!editingMedia.value || !editName.value.trim()) return
  if (editName.value === editingMedia.value.displayName) {
    cancelEdit()
    return
  }

  renameLoading.value = true
  try {
    const result = await queueRenameMedia(
      editingMedia.value.path,
      editName.value.trim(),
      props.sprintId,
      editingMedia.value.sha
    )

    // Update local list
    const index = mediaList.value.findIndex(m => m.path === editingMedia.value.path)
    if (index !== -1) {
      const newDisplayName = editName.value.trim().replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_') || 'media'
      mediaList.value[index] = {
        ...mediaList.value[index],
        path: result.path,
        sha: result.sha,
        displayName: newDisplayName,
        name: result.path.split('/').pop()
      }
    }

    // Show success message with info about updated references
    if (result.referencesUpdated > 0) {
      showSuccess(`Zmieniono nazwę i zaktualizowano ${result.referencesUpdated} ${result.referencesUpdated === 1 ? 'referencję' : 'referencji'} w sprincie`)
      // Notify parent to refresh sprint data
      emit('sprint-updated')
    } else {
      showSuccess('Zmieniono nazwę pliku')
    }

    cancelEdit()
  } catch (err) {
    console.error('Failed to rename media:', err)
    error.value = 'Nie udało się zmienić nazwy'
  } finally {
    renameLoading.value = false
  }
}

// Open delete confirmation
const confirmDelete = (media) => {
  deletingMedia.value = media
}

// Cancel delete
const cancelDelete = () => {
  deletingMedia.value = null
}

// Execute delete
const executeDelete = async () => {
  if (!deletingMedia.value) return

  deleteLoading.value = true
  try {
    await queueDeleteMedia(deletingMedia.value.path, deletingMedia.value.sha)

    // Remove from local list
    mediaList.value = mediaList.value.filter(m => m.path !== deletingMedia.value.path)
    cancelDelete()
  } catch (err) {
    console.error('Failed to delete media:', err)
    error.value = 'Nie udało się usunąć media'
  } finally {
    deleteLoading.value = false
  }
}

// Handle upload complete
const handleUploadComplete = (result) => {
  // Reload the list to get the new media
  loadMedia()
}

// Format file size
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Format timestamp to date
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Load thumbnail URL
const thumbnailUrls = ref(new Map())
const loadThumbnail = async (media) => {
  if (thumbnailUrls.value.has(media.path)) return
  try {
    const url = await getMediaUrl(media.path)
    thumbnailUrls.value.set(media.path, url)
  } catch {
    // Ignore thumbnail load errors
  }
}

// Lifecycle
onMounted(() => {
  loadMedia()
})

onUnmounted(() => {
  clearBlobCache()
  if (successTimeout.value) clearTimeout(successTimeout.value)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-semibold text-gray-900">Media sprintu</h2>
        <span class="text-sm text-gray-500">({{ mediaCount }})</span>
      </div>

      <div class="flex items-center gap-2">
        <!-- View toggle -->
        <div class="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            @click="viewMode = 'grid'"
            class="px-3 py-1.5 text-sm transition-colors"
            :class="viewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600 hover:bg-gray-50'"
            title="Widok siatki"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            @click="viewMode = 'list'"
            class="px-3 py-1.5 text-sm transition-colors"
            :class="viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600 hover:bg-gray-50'"
            title="Widok listy"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>

        <!-- Refresh button -->
        <button
          @click="loadMedia"
          :disabled="loading"
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Odśwież"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Upload section (only for active sprints) -->
    <div v-if="isSprintActive" class="p-4 border-b border-gray-200">
      <MediaUploader
        :sprint-id="sprintId"
        @upload="handleUploadComplete"
      />
    </div>

    <!-- Success message -->
    <div
      v-if="successMessage"
      class="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
    >
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span class="text-sm">{{ successMessage }}</span>
    </div>

    <!-- Content -->
    <div class="p-4">
      <!-- Loading state -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-500">Ładowanie mediów...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-600">{{ error }}</p>
        <button @click="loadMedia" class="mt-2 text-sm text-primary-600 hover:text-primary-700">
          Spróbuj ponownie
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="mediaList.length === 0" class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>Brak mediów w tym sprincie</p>
        <p v-if="isSprintActive" class="text-sm mt-1">Użyj uploadera powyżej, aby dodać media</p>
      </div>

      <!-- Grid view -->
      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="media in mediaList"
          :key="media.path"
          class="group relative"
          @mouseenter="loadThumbnail(media)"
        >
          <!-- Thumbnail container -->
          <div
            class="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative"
            @click="openPreview(media)"
          >
            <!-- Image thumbnail -->
            <img
              v-if="media.type === 'image' && thumbnailUrls.get(media.path)"
              :src="thumbnailUrls.get(media.path)"
              :alt="media.displayName"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <!-- Video placeholder -->
            <div v-else-if="media.type === 'video'" class="w-full h-full flex items-center justify-center bg-gray-200">
              <svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <!-- Loading placeholder -->
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <!-- Video play overlay -->
            <div v-if="media.type === 'video'" class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>

            <!-- Hover overlay with actions -->
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                @click.stop="startEdit(media)"
                class="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                title="Edytuj nazwę"
              >
                <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click.stop="confirmDelete(media)"
                class="p-2 bg-white rounded-full hover:bg-red-100 transition-colors"
                title="Usuń"
              >
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Name (editable) -->
          <div class="mt-2 relative">
            <div v-if="editingMedia?.path === media.path" class="absolute left-0 right-0 top-0 z-10 bg-white rounded shadow-lg p-1 flex gap-1">
              <input
                v-model="editName"
                @keydown.enter="saveEdit"
                @keydown.escape="cancelEdit"
                class="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                :disabled="renameLoading"
                autofocus
              />
              <button
                @click="saveEdit"
                :disabled="renameLoading"
                class="p-1 text-green-600 hover:text-green-700 disabled:opacity-50 flex-shrink-0"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                @click="cancelEdit"
                :disabled="renameLoading"
                class="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 flex-shrink-0"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p v-else class="text-xs text-gray-700 truncate" :title="media.displayName">
              {{ media.displayName }}
            </p>
          </div>
        </div>
      </div>

      <!-- List view -->
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="media in mediaList"
          :key="media.path"
          class="flex items-center gap-4 py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
        >
          <!-- Thumbnail -->
          <div
            class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
            @click="openPreview(media)"
            @mouseenter="loadThumbnail(media)"
          >
            <img
              v-if="media.type === 'image' && thumbnailUrls.get(media.path)"
              :src="thumbnailUrls.get(media.path)"
              :alt="media.displayName"
              class="w-full h-full object-cover"
            />
            <div v-else-if="media.type === 'video'" class="w-full h-full flex items-center justify-center bg-gray-200 relative">
              <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div v-if="editingMedia?.path === media.path" class="flex gap-2 items-center">
              <input
                v-model="editName"
                @keydown.enter="saveEdit"
                @keydown.escape="cancelEdit"
                class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                :disabled="renameLoading"
                autofocus
              />
              <button
                @click="saveEdit"
                :disabled="renameLoading"
                class="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-50"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                @click="cancelEdit"
                :disabled="renameLoading"
                class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p v-else class="text-sm font-medium text-gray-900 truncate">{{ media.displayName }}</p>
            <div class="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span>{{ formatSize(media.size) }}</span>
              <span>{{ formatDate(media.timestamp) }}</span>
              <span class="uppercase">{{ media.extension }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1">
            <button
              @click="startEdit(media)"
              class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edytuj nazwę"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="confirmDelete(media)"
              class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Usuń"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <Teleport to="body">
      <div
        v-if="previewMedia"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        @click.self="closePreview"
      >
        <button
          @click="closePreview"
          class="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="max-w-[90vw] max-h-[90vh]">
          <img
            v-if="previewMedia.type === 'image' && previewUrl"
            :src="previewUrl"
            :alt="previewMedia.displayName"
            class="max-w-full max-h-[90vh] object-contain"
          />
          <video
            v-else-if="previewMedia.type === 'video' && previewUrl"
            :src="previewUrl"
            controls
            autoplay
            class="max-w-full max-h-[90vh]"
          ></video>
          <div v-else class="text-white text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p class="mt-4">Ładowanie...</p>
          </div>
        </div>

        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center">
          <p class="text-lg font-medium">{{ previewMedia.displayName }}</p>
          <p class="text-sm text-gray-300">{{ formatSize(previewMedia.size) }}</p>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="deletingMedia"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="cancelDelete"
      >
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          <div class="text-center mb-6">
            <div class="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">Usunąć media?</h3>
            <p class="text-gray-600 mt-2">
              Czy na pewno chcesz usunąć <strong>{{ deletingMedia.displayName }}</strong>?
            </p>
            <p class="text-sm text-red-600 mt-2">Ta operacja jest nieodwracalna.</p>
          </div>

          <div class="flex gap-3">
            <button
              @click="cancelDelete"
              :disabled="deleteLoading"
              class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              @click="executeDelete"
              :disabled="deleteLoading"
              class="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg v-if="deleteLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ deleteLoading ? 'Usuwanie...' : 'Usuń' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
