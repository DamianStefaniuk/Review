<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { isRepoDataConfigured } from '../services/repoDataService'
import { useOperationQueue } from '../composables/useOperationQueue'
import MediaUploader from './MediaUploader.vue'
import { generateMediaMarkdown, renderMarkdownWithMedia, processMediaUrls } from '../utils/markdownMedia'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  sprintId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['update'])

const authStore = useAuthStore()
const { queueSaveAchievements, retryInfo } = useOperationQueue()

const isEditing = ref(false)
const editContent = ref('')
const saving = ref(false)
const saveError = ref(null)
const showMediaUploader = ref(false)
const textareaRef = ref(null)
const contentRef = ref(null)
const editPreviewRef = ref(null)

const canEdit = computed(() => authStore.isAuthenticated && isRepoDataConfigured())

const renderedContent = computed(() => {
  if (!props.content) return ''
  return renderMarkdownWithMedia(props.content)
})

const renderedEditPreview = computed(() => {
  if (!editContent.value) return ''
  return renderMarkdownWithMedia(editContent.value)
})

// Process media URLs when content changes
watch(renderedContent, async () => {
  await nextTick()
  if (contentRef.value) {
    processMediaUrls(contentRef.value)
  }
})

// Process media URLs in edit preview
const processEditPreviewMedia = async () => {
  await nextTick()
  if (editPreviewRef.value) {
    processMediaUrls(editPreviewRef.value)
  }
}

watch(editContent, processEditPreviewMedia)

onMounted(() => {
  if (contentRef.value) {
    processMediaUrls(contentRef.value)
  }
})

watch(() => props.content, (newContent) => {
  editContent.value = newContent || ''
}, { immediate: true })

const startEditing = () => {
  editContent.value = props.content || ''
  isEditing.value = true
  saveError.value = null
  showMediaUploader.value = false
}

const cancelEditing = () => {
  editContent.value = props.content || ''
  isEditing.value = false
  saveError.value = null
  showMediaUploader.value = false
}

const saveChanges = async () => {
  saving.value = true
  saveError.value = null

  try {
    await queueSaveAchievements(props.sprintId, editContent.value, {
      onRetry: (attempt, maxRetries) => {
        saveError.value = `Konflikt danych, ponawiam (${attempt}/${maxRetries})...`
      }
    })

    // Emit update event to parent
    emit('update', editContent.value)
    isEditing.value = false
    showMediaUploader.value = false
  } catch (error) {
    saveError.value = error.message || 'Nie udało się zapisać zmian'
  } finally {
    saving.value = false
  }
}

const toggleMediaUploader = () => {
  showMediaUploader.value = !showMediaUploader.value
}

const handleMediaUpload = (result) => {
  const markdown = generateMediaMarkdown(result)
  insertAtCursor(markdown)
  showMediaUploader.value = false
}

const handleMediaError = (error) => {
  console.error('Media upload error:', error)
}

const insertAtCursor = (text) => {
  const textarea = textareaRef.value
  if (!textarea) {
    editContent.value += '\n' + text
    return
  }

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = editContent.value.substring(0, start)
  const after = editContent.value.substring(end)

  const needsNewlineBefore = before.length > 0 && !before.endsWith('\n')
  const needsNewlineAfter = after.length > 0 && !after.startsWith('\n')

  const insertText = (needsNewlineBefore ? '\n' : '') + text + (needsNewlineAfter ? '\n' : '')

  editContent.value = before + insertText + after

  const newPosition = start + insertText.length
  textarea.focus()
  setTimeout(() => {
    textarea.setSelectionRange(newPosition, newPosition)
  }, 0)
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Osiągnięcia Dodatkowe</h3>
        <button
          v-if="canEdit && !isEditing"
          @click="startEditing"
          class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edytuj
        </button>
      </div>
    </div>

    <!-- Edit mode -->
    <div v-if="isEditing" class="p-6">
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">
            Tresc (obsluguje Markdown)
          </label>
          <button
            @click="toggleMediaUploader"
            type="button"
            class="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Dodaj media
          </button>
        </div>

        <!-- Media Uploader -->
        <div v-if="showMediaUploader" class="mb-4">
          <MediaUploader
            :sprint-id="sprintId"
            @upload="handleMediaUpload"
            @error="handleMediaError"
          />
        </div>

        <textarea
          ref="textareaRef"
          v-model="editContent"
          rows="8"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
          placeholder="- Osiagniecie 1&#10;- Osiagniecie 2&#10;- Osiagniecie 3"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500">
          Mozesz uzywac skladni Markdown: listy (- lub 1.), pogrubienie (**tekst**), kursywa (*tekst*), itp.
        </p>
      </div>

      <!-- Error message -->
      <div v-if="saveError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm text-red-700">{{ saveError }}</p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          @click="cancelEditing"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          Anuluj
        </button>
        <button
          @click="saveChanges"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ saving ? 'Zapisywanie...' : 'Zapisz' }}
        </button>
      </div>

      <!-- Preview -->
      <div v-if="editContent" class="mt-6 pt-6 border-t border-gray-200">
        <h4 class="text-sm font-medium text-gray-700 mb-3">Podglad:</h4>
        <div
          ref="editPreviewRef"
          class="markdown-content prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg"
          v-html="renderedEditPreview"
        ></div>
      </div>
    </div>

    <!-- View mode -->
    <div v-else class="p-6">
      <div
        v-if="renderedContent"
        ref="contentRef"
        class="markdown-content prose prose-sm max-w-none"
        v-html="renderedContent"
      ></div>
      <p v-else class="text-gray-500 text-center py-4">
        Brak osiągnięć dodatkowych
        <button
          v-if="canEdit"
          @click="startEditing"
          class="block mx-auto mt-2 text-sm text-primary-600 hover:text-primary-700"
        >
          Dodaj osiągnięcia
        </button>
      </p>
    </div>
  </div>
</template>
