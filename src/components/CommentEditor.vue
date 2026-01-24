<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import MediaUploader from './MediaUploader.vue'
import { generateMediaMarkdown, renderMarkdownWithMedia, processMediaUrls } from '../utils/markdownMedia'

const props = defineProps({
  sprintId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['submit'])

const commentText = ref('')
const isSubmitting = ref(false)
const showMediaUploader = ref(false)
const textareaRef = ref(null)
const previewRef = ref(null)

const renderedPreview = computed(() => {
  if (!commentText.value) return ''
  return renderMarkdownWithMedia(commentText.value)
})

// Process media in preview when content changes
const processPreviewMedia = async () => {
  await nextTick()
  if (previewRef.value) {
    processMediaUrls(previewRef.value)
  }
}

watch(commentText, processPreviewMedia)

const handleSubmit = async () => {
  if (!commentText.value.trim()) return

  isSubmitting.value = true
  emit('submit', { text: commentText.value.trim() })
  commentText.value = ''
  isSubmitting.value = false
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
    commentText.value += '\n' + text
    return
  }

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = commentText.value.substring(0, start)
  const after = commentText.value.substring(end)

  // Add newlines if needed
  const needsNewlineBefore = before.length > 0 && !before.endsWith('\n')
  const needsNewlineAfter = after.length > 0 && !after.startsWith('\n')

  const insertText = (needsNewlineBefore ? '\n' : '') + text + (needsNewlineAfter ? '\n' : '')

  commentText.value = before + insertText + after

  // Set cursor position after inserted text
  const newPosition = start + insertText.length
  textarea.focus()
  setTimeout(() => {
    textarea.setSelectionRange(newPosition, newPosition)
  }, 0)
}
</script>

<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <div class="p-3">
      <textarea
        ref="textareaRef"
        v-model="commentText"
        placeholder="Dodaj komentarz do review..."
        rows="3"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none font-mono"
      ></textarea>
      <div class="mt-1 flex items-center justify-between">
        <p class="text-xs text-gray-500">
          Markdown: listy (- lub 1.), **pogrubienie**, *kursywa*
        </p>
        <button
          @click="toggleMediaUploader"
          type="button"
          class="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
          title="Dodaj media"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Media
        </button>
      </div>
    </div>

    <!-- Media Uploader -->
    <div v-if="showMediaUploader" class="px-3 pb-3">
      <div class="pt-3 border-t border-gray-200">
        <MediaUploader
          :sprint-id="sprintId"
          @upload="handleMediaUpload"
          @error="handleMediaError"
        />
      </div>
    </div>

    <!-- Preview -->
    <div v-if="commentText" class="px-3 pb-3">
      <div class="pt-3 border-t border-gray-200">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Podglad:</h4>
        <div
          ref="previewRef"
          class="markdown-content prose prose-sm max-w-none p-3 bg-gray-50 rounded-lg"
          v-html="renderedPreview"
        ></div>
      </div>
    </div>

    <div class="px-3 pb-3 flex justify-end">
      <button
        @click="handleSubmit"
        :disabled="!commentText.trim() || isSubmitting"
        class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="isSubmitting" class="flex items-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Zapisywanie...
        </span>
        <span v-else>Dodaj komentarz</span>
      </button>
    </div>
  </div>
</template>
