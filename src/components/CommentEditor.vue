<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const emit = defineEmits(['submit'])

const commentText = ref('')
const isSubmitting = ref(false)

const renderedPreview = computed(() => {
  if (!commentText.value) return ''
  return DOMPurify.sanitize(marked(commentText.value))
})

const handleSubmit = async () => {
  if (!commentText.value.trim()) return

  isSubmitting.value = true
  emit('submit', { text: commentText.value.trim() })
  commentText.value = ''
  isSubmitting.value = false
}
</script>

<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <div class="p-3">
      <textarea
        v-model="commentText"
        placeholder="Dodaj komentarz do review..."
        rows="3"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none font-mono"
      ></textarea>
      <p class="mt-1 text-xs text-gray-500">
        Markdown: listy (- lub 1.), **pogrubienie**, *kursywa*
      </p>
    </div>

    <!-- Preview -->
    <div v-if="commentText" class="px-3 pb-3">
      <div class="pt-3 border-t border-gray-200">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Podglad:</h4>
        <div
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
