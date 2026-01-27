<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { validateFile, fileToBase64, getFileCategory, uploadMedia } from '../services/mediaService'

const props = defineProps({
  sprintId: {
    type: [Number, String],
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['upload', 'error'])

// State
const isDragging = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const previewFile = ref(null)
const previewUrl = ref(null)
const errorMessage = ref(null)

// Refs
const fileInput = ref(null)

// Computed
const previewType = computed(() => {
  if (!previewFile.value) return null
  return getFileCategory(previewFile.value)
})

// Handle file selection (from input, drag, or paste)
const handleFile = async (file) => {
  if (!file || props.disabled) return

  errorMessage.value = null

  // Validate
  const validation = validateFile(file)
  if (!validation.valid) {
    errorMessage.value = validation.error
    emit('error', validation.error)
    return
  }

  // Create preview
  previewFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

// Start upload
const startUpload = async () => {
  if (!previewFile.value || isUploading.value) return

  isUploading.value = true
  uploadProgress.value = 0
  errorMessage.value = null

  try {
    const result = await uploadMedia(
      props.sprintId,
      previewFile.value,
      (progress) => {
        uploadProgress.value = progress
      }
    )

    emit('upload', result)
    clearPreview()
  } catch (error) {
    errorMessage.value = error.message
    emit('error', error.message)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

// Clear preview
const clearPreview = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewFile.value = null
  previewUrl.value = null
  errorMessage.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// File input handlers
const triggerFileInput = () => {
  if (props.disabled) return
  fileInput.value?.click()
}

const onFileInputChange = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    handleFile(file)
  }
}

// Drag and drop handlers
const onDragEnter = (event) => {
  if (props.disabled) return
  event.preventDefault()
  isDragging.value = true
}

const onDragOver = (event) => {
  if (props.disabled) return
  event.preventDefault()
  isDragging.value = true
}

const onDragLeave = (event) => {
  event.preventDefault()
  isDragging.value = false
}

const onDrop = (event) => {
  event.preventDefault()
  isDragging.value = false

  if (props.disabled) return

  const file = event.dataTransfer?.files?.[0]
  if (file) {
    handleFile(file)
  }
}

// Paste handler
const onPaste = (event) => {
  if (props.disabled) return

  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
      const file = item.getAsFile()
      if (file) {
        handleFile(file)
        event.preventDefault()
        break
      }
    }
  }
}

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Cleanup blob URLs when component unmounts to prevent memory leaks
onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
})
</script>

<template>
  <div class="media-uploader">
    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
      class="hidden"
      @change="onFileInputChange"
    />

    <!-- Preview mode -->
    <div v-if="previewFile" class="preview-container">
      <div class="preview-media">
        <!-- Image preview -->
        <img
          v-if="previewType === 'image'"
          :src="previewUrl"
          :alt="previewFile.name"
          class="max-h-48 max-w-full rounded-lg object-contain"
        />
        <!-- Video preview -->
        <video
          v-else-if="previewType === 'video'"
          :src="previewUrl"
          controls
          class="max-h-48 max-w-full rounded-lg"
        ></video>
      </div>

      <div class="preview-info">
        <p class="text-sm text-gray-700 truncate">{{ previewFile.name }}</p>
        <p class="text-xs text-gray-500">{{ formatFileSize(previewFile.size) }}</p>
      </div>

      <!-- Progress bar -->
      <div v-if="isUploading" class="progress-container">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: uploadProgress + '%' }"
          ></div>
        </div>
        <span class="text-xs text-gray-500">{{ uploadProgress }}%</span>
      </div>

      <!-- Actions -->
      <div class="preview-actions">
        <button
          @click="clearPreview"
          :disabled="isUploading"
          class="btn-cancel"
        >
          Anuluj
        </button>
        <button
          @click="startUpload"
          :disabled="isUploading"
          class="btn-upload"
        >
          <svg v-if="isUploading" class="w-4 h-4 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isUploading ? 'Wysyłanie...' : 'Wyślij' }}
        </button>
      </div>
    </div>

    <!-- Drop zone -->
    <div
      v-else
      class="drop-zone"
      :class="{
        'drop-zone-active': isDragging,
        'drop-zone-disabled': disabled
      }"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @paste="onPaste"
      @click="triggerFileInput"
      tabindex="0"
      @keydown.enter="triggerFileInput"
      @keydown.space.prevent="triggerFileInput"
    >
      <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-sm text-gray-600">
        <span class="font-medium text-primary-600">Kliknij</span>, przeciągnij lub wklej (Ctrl+V)
      </p>
      <p class="text-xs text-gray-500 mt-1">
        Obrazy (max 10MB) lub video (max 50MB)
      </p>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="error-message">
      <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.media-uploader {
  @apply w-full;
}

.drop-zone {
  @apply border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer transition-colors;
  @apply hover:border-primary-400 hover:bg-primary-50;
  @apply focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200;
}

.drop-zone-active {
  @apply border-primary-500 bg-primary-50;
}

.drop-zone-disabled {
  @apply opacity-50 cursor-not-allowed hover:border-gray-300 hover:bg-transparent;
}

.preview-container {
  @apply border border-gray-200 rounded-lg p-4 bg-gray-50;
}

.preview-media {
  @apply flex justify-center mb-3;
}

.preview-info {
  @apply text-center mb-3;
}

.progress-container {
  @apply flex items-center gap-2 mb-3;
}

.progress-bar {
  @apply flex-1 h-2 bg-gray-200 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-primary-500 transition-all duration-300;
}

.preview-actions {
  @apply flex justify-center gap-2;
}

.btn-cancel {
  @apply px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50;
}

.btn-upload {
  @apply px-3 py-1.5 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 flex items-center;
}

.error-message {
  @apply flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700;
}
</style>
