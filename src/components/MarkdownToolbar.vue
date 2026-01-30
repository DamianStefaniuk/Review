<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useMarkdownEditor } from '../composables/useMarkdownEditor'
import MediaPickerModal from './MediaPickerModal.vue'
import { generateMediaMarkdown } from '../utils/markdownMedia'
import { validateFile, uploadMedia, getFileCategory } from '../services/mediaService'

const props = defineProps({
  textareaRef: {
    type: Object,
    default: null
  },
  modelValue: {
    type: String,
    required: true
  },
  sprintId: {
    type: [Number, String],
    required: true
  },
  showMediaButtons: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// Local ref for v-model binding with composable
const localValue = ref(props.modelValue)

// Sync local value with props
watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal
})

// Emit changes when local value changes
watch(localValue, (newVal) => {
  emit('update:modelValue', newVal)
})

// Media state
const showMediaPicker = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref(null)
const isDragging = ref(false)

// File input ref
const fileInputRef = ref(null)

// Initialize markdown editor composable
const {
  wrapSelection,
  prefixLines,
  prefixLinesNumbered,
  insertLink,
  insertMedia
} = useMarkdownEditor(
  { get value() { return props.textareaRef } },
  localValue
)

// Toolbar actions
const handleBold = () => {
  if (props.disabled) return
  wrapSelection('**', '**', 'pogrubiony tekst')
}

const handleItalic = () => {
  if (props.disabled) return
  wrapSelection('*', '*', 'pochylony tekst')
}

const handleBulletList = () => {
  if (props.disabled) return
  prefixLines('- ')
}

const handleNumberedList = () => {
  if (props.disabled) return
  prefixLinesNumbered()
}

const handleLink = () => {
  if (props.disabled) return
  const url = prompt('Podaj adres URL:')
  if (url) {
    // Validate URL to prevent javascript: and other dangerous protocols
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        alert('Dozwolone tylko linki HTTP/HTTPS')
        return
      }
      insertLink(url)
    } catch {
      alert('Nieprawidłowy URL')
    }
  }
}

// Direct file upload - open file explorer immediately
const handleUploadClick = () => {
  if (props.disabled || isUploading.value) return
  fileInputRef.value?.click()
}

const handleGalleryClick = () => {
  if (props.disabled) return
  showMediaPicker.value = true
}

// Handle file from input, paste or drop
const handleFile = async (file) => {
  if (!file || props.disabled || isUploading.value) return

  uploadError.value = null

  // Validate
  const validation = validateFile(file)
  if (!validation.valid) {
    uploadError.value = validation.error
    setTimeout(() => { uploadError.value = null }, 4000)
    return
  }

  // Start upload immediately
  isUploading.value = true
  uploadProgress.value = 0

  try {
    const result = await uploadMedia(
      props.sprintId,
      file,
      (progress) => {
        uploadProgress.value = progress
      }
    )

    const markdown = generateMediaMarkdown(result)
    insertMedia(markdown)
  } catch (error) {
    uploadError.value = error.message
    setTimeout(() => { uploadError.value = null }, 4000)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
    // Reset file input
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

// File input change handler
const onFileInputChange = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    handleFile(file)
  }
}

// Paste handler for Ctrl+V
const handlePaste = (event) => {
  if (props.disabled || !props.showMediaButtons) return

  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        handleFile(file)
        break
      }
    }
  }
}

// Drag and drop handlers
const handleDragEnter = (event) => {
  if (props.disabled || !props.showMediaButtons) return
  event.preventDefault()
  isDragging.value = true
}

const handleDragOver = (event) => {
  if (props.disabled || !props.showMediaButtons) return
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event) => {
  event.preventDefault()
  isDragging.value = false
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false

  if (props.disabled || !props.showMediaButtons) return

  const file = event.dataTransfer?.files?.[0]
  if (file) {
    // Check if it's a media file
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      handleFile(file)
    }
  }
}

const handleMediaSelect = (result) => {
  insertMedia(result.markdown)
  showMediaPicker.value = false
}

const handleMediaPickerClose = () => {
  showMediaPicker.value = false
}

// Keyboard shortcuts handler
const handleKeydown = (event) => {
  if (props.disabled) return

  // Check if Ctrl (or Cmd on Mac) is pressed
  const isCtrl = event.ctrlKey || event.metaKey

  if (isCtrl) {
    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault()
        handleBold()
        break
      case 'i':
        event.preventDefault()
        handleItalic()
        break
      case 'k':
        event.preventDefault()
        handleLink()
        break
    }
  }
}

// Register event listeners on the textarea
const attachTextareaListeners = (textarea) => {
  if (!textarea) return
  textarea.addEventListener('keydown', handleKeydown)
  textarea.addEventListener('paste', handlePaste)
  textarea.addEventListener('dragenter', handleDragEnter)
  textarea.addEventListener('dragover', handleDragOver)
  textarea.addEventListener('dragleave', handleDragLeave)
  textarea.addEventListener('drop', handleDrop)
}

const detachTextareaListeners = (textarea) => {
  if (!textarea) return
  textarea.removeEventListener('keydown', handleKeydown)
  textarea.removeEventListener('paste', handlePaste)
  textarea.removeEventListener('dragenter', handleDragEnter)
  textarea.removeEventListener('dragover', handleDragOver)
  textarea.removeEventListener('dragleave', handleDragLeave)
  textarea.removeEventListener('drop', handleDrop)
}

onMounted(() => {
  const textarea = props.textareaRef
  attachTextareaListeners(textarea)
})

onUnmounted(() => {
  const textarea = props.textareaRef
  detachTextareaListeners(textarea)
})

// Watch for textarea ref changes
watch(() => props.textareaRef, (newRef, oldRef) => {
  detachTextareaListeners(oldRef)
  attachTextareaListeners(newRef)
})
</script>

<template>
  <div>
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
      class="hidden"
      @change="onFileInputChange"
    />

    <!-- Toolbar -->
    <div
      class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-lg overflow-x-auto scrollbar-thin"
      :class="{ 'bg-primary-50 border-primary-300': isDragging }"
    >
      <div class="flex items-center gap-1 min-w-max">
      <!-- Bold -->
      <button
        type="button"
        @click="handleBold"
        :disabled="disabled"
        class="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Pogrubienie (Ctrl+B)"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      </button>

      <!-- Italic -->
      <button
        type="button"
        @click="handleItalic"
        :disabled="disabled"
        class="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Kursywa (Ctrl+I)"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </button>

      <!-- Separator -->
      <div class="w-px h-5 bg-gray-300 mx-1"></div>

      <!-- Bullet list -->
      <button
        type="button"
        @click="handleBulletList"
        :disabled="disabled"
        class="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Lista punktowana"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="9" y1="6" x2="20" y2="6"/>
          <line x1="9" y1="12" x2="20" y2="12"/>
          <line x1="9" y1="18" x2="20" y2="18"/>
          <circle cx="5" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="5" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      </button>

      <!-- Numbered list -->
      <button
        type="button"
        @click="handleNumberedList"
        :disabled="disabled"
        class="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Lista numerowana"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="10" y1="6" x2="20" y2="6"/>
          <line x1="10" y1="12" x2="20" y2="12"/>
          <line x1="10" y1="18" x2="20" y2="18"/>
          <text x="3" y="8" font-size="7" fill="currentColor" stroke="none" font-family="sans-serif">1</text>
          <text x="3" y="14" font-size="7" fill="currentColor" stroke="none" font-family="sans-serif">2</text>
          <text x="3" y="20" font-size="7" fill="currentColor" stroke="none" font-family="sans-serif">3</text>
        </svg>
      </button>

      <!-- Separator -->
      <div class="w-px h-5 bg-gray-300 mx-1"></div>

      <!-- Link -->
      <button
        type="button"
        @click="handleLink"
        :disabled="disabled"
        class="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Wstaw link (Ctrl+K)"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>

      <!-- Media buttons -->
      <template v-if="showMediaButtons">
        <!-- Separator -->
        <div class="w-px h-5 bg-gray-300 mx-1"></div>

        <!-- Upload media (opens file explorer directly) -->
        <button
          type="button"
          @click="handleUploadClick"
          :disabled="disabled || isUploading"
          class="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Dodaj media (upload, Ctrl+V lub przeciągnij)"
        >
          <svg v-if="isUploading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        <!-- Gallery picker -->
        <button
          type="button"
          @click="handleGalleryClick"
          :disabled="disabled"
          class="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Wybierz z galerii"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </button>

        <!-- Upload progress indicator -->
        <div v-if="isUploading" class="flex items-center gap-2 ml-2 text-xs text-gray-500">
          <div class="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-primary-500 transition-all duration-300"
              :style="{ width: uploadProgress + '%' }"
            ></div>
          </div>
          <span>{{ uploadProgress }}%</span>
        </div>

        <!-- Upload error -->
        <div v-if="uploadError" class="flex items-center gap-1 ml-2 text-xs text-red-600">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span class="truncate max-w-48">{{ uploadError }}</span>
        </div>
      </template>
      </div>
    </div>

    <!-- Media Picker Modal -->
    <MediaPickerModal
      v-if="showMediaPicker && showMediaButtons"
      :sprint-id="sprintId"
      @select="handleMediaSelect"
      @close="handleMediaPickerClose"
    />
  </div>
</template>
