<script setup>
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  jiraTimelineUrl: {
    type: String,
    default: ''
  }
})

const showIframe = ref(false)
const iframeError = ref(false)

const renderedContent = computed(() => {
  if (!props.content) return ''
  return marked(props.content)
})

const handleIframeError = () => {
  iframeError.value = true
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Plany na następny sprint</h3>
        <a
          v-if="jiraTimelineUrl"
          :href="jiraTimelineUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          Otwórz w Jira
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6">
      <div
        v-if="renderedContent"
        class="markdown-content prose prose-sm max-w-none"
        v-html="renderedContent"
      ></div>
      <p v-else class="text-gray-500 text-center py-4">
        Brak planów na następny sprint
      </p>
    </div>

    <!-- Jira Timeline iframe toggle -->
    <div v-if="jiraTimelineUrl" class="border-t border-gray-200">
      <button
        @click="showIframe = !showIframe"
        class="w-full px-6 py-3 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-between transition-colors"
      >
        <span>{{ showIframe ? 'Ukryj' : 'Pokaż' }} timeline Jira</span>
        <svg
          class="w-5 h-5 transition-transform"
          :class="{ 'rotate-180': showIframe }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div v-if="showIframe" class="p-4 bg-gray-50 border-t border-gray-200">
        <div v-if="iframeError" class="text-center py-8 text-gray-500">
          <p class="mb-2">Nie można załadować widoku Jira.</p>
          <a
            :href="jiraTimelineUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-600 hover:text-primary-700"
          >
            Otwórz w nowej karcie
          </a>
        </div>
        <iframe
          v-else
          :src="jiraTimelineUrl"
          class="w-full h-96 border border-gray-200 rounded-lg"
          @error="handleIframeError"
        ></iframe>
      </div>
    </div>
  </div>
</template>
