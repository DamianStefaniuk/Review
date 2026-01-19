<script setup>
import { ref } from 'vue'

const emit = defineEmits(['submit'])

const commentText = ref('')
const authorName = ref(localStorage.getItem('reviewAuthor') || '')
const isSubmitting = ref(false)

const handleSubmit = async () => {
  if (!commentText.value.trim() || !authorName.value.trim()) return

  isSubmitting.value = true

  // Save author name for future use
  localStorage.setItem('reviewAuthor', authorName.value)

  emit('submit', {
    text: commentText.value.trim(),
    author: authorName.value.trim()
  })

  commentText.value = ''
  isSubmitting.value = false
}
</script>

<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden">
    <div class="p-3 bg-gray-50 border-b border-gray-200">
      <input
        v-model="authorName"
        type="text"
        placeholder="Twoje imię"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
      />
    </div>
    <div class="p-3">
      <textarea
        v-model="commentText"
        placeholder="Dodaj komentarz do review..."
        rows="3"
        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
      ></textarea>
    </div>
    <div class="px-3 pb-3 flex justify-end">
      <button
        @click="handleSubmit"
        :disabled="!commentText.trim() || !authorName.trim() || isSubmitting"
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
