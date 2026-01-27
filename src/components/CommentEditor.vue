<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import MarkdownToolbar from './MarkdownToolbar.vue'
import { renderMarkdownWithMedia, processMediaUrls } from '../utils/markdownMedia'

const props = defineProps({
  sprintId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['submit'])

const MAX_COMMENT_SIZE = 50000 // 50KB

const commentText = ref('')
const isSubmitting = ref(false)
const textareaRef = ref(null)
const previewRef = ref(null)
const sizeError = ref(null)

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

  if (commentText.value.length > MAX_COMMENT_SIZE) {
    sizeError.value = `Komentarz jest zbyt długi (${(commentText.value.length / 1000).toFixed(1)}KB / max ${MAX_COMMENT_SIZE / 1000}KB)`
    return
  }

  sizeError.value = null
  isSubmitting.value = true
  emit('submit', { text: commentText.value.trim() })
  commentText.value = ''
  isSubmitting.value = false
}

// Clear size error when text becomes valid
watch(commentText, (newValue) => {
  if (newValue.length <= MAX_COMMENT_SIZE) {
    sizeError.value = null
  }
})
</script>

<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <!-- Markdown Toolbar -->
    <MarkdownToolbar
      :textarea-ref="textareaRef"
      v-model="commentText"
      :sprint-id="sprintId"
    />

    <div class="p-3">
      <textarea
        ref="textareaRef"
        v-model="commentText"
        placeholder="Dodaj komentarz do review..."
        rows="3"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none font-mono"
      ></textarea>
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

    <!-- Size error -->
    <div v-if="sizeError" class="px-3 pb-2">
      <p class="text-sm text-red-600">{{ sizeError }}</p>
    </div>

    <div class="px-3 pb-3 flex justify-end">
      <button
        @click="handleSubmit"
        :disabled="!commentText.trim() || isSubmitting || sizeError"
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
