<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useMarkdownEditor } from '../composables/useMarkdownEditor'
import MediaUploader from './MediaUploader.vue'
import MediaPickerModal from './MediaPickerModal.vue'
import { generateMediaMarkdown } from '../utils/markdownMedia'

const props = defineProps({
  textareaRef: {
    type: Object,
    required: true
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
const showMediaUploader = ref(false)
const showMediaPicker = ref(false)

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
    insertLink(url)
  }
}

const handleUploadClick = () => {
  if (props.disabled) return
  showMediaUploader.value = !showMediaUploader.value
  showMediaPicker.value = false
}

const handleGalleryClick = () => {
  if (props.disabled) return
  showMediaPicker.value = true
  showMediaUploader.value = false
}

const handleMediaUpload = (result) => {
  const markdown = generateMediaMarkdown(result)
  insertMedia(markdown)
  showMediaUploader.value = false
}

const handleMediaError = (error) => {
  console.error('Media upload error:', error)
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

// Register keyboard shortcuts on the textarea
onMounted(() => {
  const textarea = props.textareaRef
  if (textarea) {
    textarea.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  const textarea = props.textareaRef
  if (textarea) {
    textarea.removeEventListener('keydown', handleKeydown)
  }
})

// Watch for textarea ref changes
watch(() => props.textareaRef, (newRef, oldRef) => {
  if (oldRef) {
    oldRef.removeEventListener('keydown', handleKeydown)
  }
  if (newRef) {
    newRef.addEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <div>
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-lg">
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

        <!-- Upload media -->
        <button
          type="button"
          @click="handleUploadClick"
          :disabled="disabled"
          :class="[
            'p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            showMediaUploader
              ? 'text-primary-700 bg-primary-100 hover:bg-primary-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          ]"
          title="Dodaj media (upload)"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      </template>
    </div>

    <!-- Media Uploader -->
    <div v-if="showMediaUploader && showMediaButtons" class="p-3 border-b border-gray-200 bg-gray-50">
      <MediaUploader
        :sprint-id="sprintId"
        @upload="handleMediaUpload"
        @error="handleMediaError"
      />
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
