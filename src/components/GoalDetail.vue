<script setup>
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import CommentEditor from './CommentEditor.vue'
import { getTasksForGoal } from '../services/dataLoader'

const props = defineProps({
  goal: {
    type: Object,
    required: true
  },
  sprint: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'addComment'])

const tasks = computed(() => getTasksForGoal(props.sprint, props.goal))

const tasksByStatus = computed(() => {
  const grouped = {
    'Done': [],
    'In Progress': [],
    'To Do': []
  }
  tasks.value.forEach(task => {
    if (grouped[task.status]) {
      grouped[task.status].push(task)
    } else {
      grouped['To Do'].push(task)
    }
  })
  return grouped
})

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusColors = {
  'Done': 'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'To Do': 'bg-gray-100 text-gray-600'
}

const handleAddComment = (comment) => {
  emit('addComment', { goalId: props.goal.id, comment })
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-5 border-b border-gray-200">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span
              v-if="goal.completed"
              class="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </span>
            <h2 class="text-xl font-bold text-gray-900">{{ goal.title }}</h2>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span v-if="goal.client" class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {{ goal.client }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {{ goal.tag }}
            </span>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Progress -->
      <div class="mt-4">
        <ProgressBar :percent="goal.completionPercent" size="md" />
      </div>
    </div>

    <!-- Tasks -->
    <div class="p-6 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        Zadania ({{ tasks.length }})
      </h3>

      <div class="space-y-4">
        <!-- Done tasks -->
        <div v-if="tasksByStatus['Done'].length > 0">
          <h4 class="text-sm font-medium text-gray-500 mb-2">Ukończone</h4>
          <div class="space-y-2">
            <div
              v-for="task in tasksByStatus['Done']"
              :key="task.key"
              class="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
            >
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                <p class="text-sm text-gray-900">{{ task.summary }}</p>
              </div>
              <span v-if="task.assignee" class="text-xs text-gray-500">{{ task.assignee }}</span>
            </div>
          </div>
        </div>

        <!-- In Progress tasks -->
        <div v-if="tasksByStatus['In Progress'].length > 0">
          <h4 class="text-sm font-medium text-gray-500 mb-2">W trakcie</h4>
          <div class="space-y-2">
            <div
              v-for="task in tasksByStatus['In Progress']"
              :key="task.key"
              class="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
            >
              <span class="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              </span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                <p class="text-sm text-gray-900">{{ task.summary }}</p>
              </div>
              <span v-if="task.assignee" class="text-xs text-gray-500">{{ task.assignee }}</span>
            </div>
          </div>
        </div>

        <!-- To Do tasks -->
        <div v-if="tasksByStatus['To Do'].length > 0">
          <h4 class="text-sm font-medium text-gray-500 mb-2">Do zrobienia</h4>
          <div class="space-y-2">
            <div
              v-for="task in tasksByStatus['To Do']"
              :key="task.key"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <span class="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300"></span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                <p class="text-sm text-gray-900">{{ task.summary }}</p>
              </div>
              <span v-if="task.assignee" class="text-xs text-gray-500">{{ task.assignee }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comments -->
    <div class="p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        Komentarze ({{ goal.comments.length }})
      </h3>

      <div v-if="goal.comments.length > 0" class="space-y-4 mb-6">
        <div
          v-for="comment in goal.comments"
          :key="comment.id"
          class="p-4 bg-gray-50 rounded-lg"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-gray-900">{{ comment.author }}</span>
            <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
          </div>
          <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ comment.text }}</p>
        </div>
      </div>

      <CommentEditor
        v-if="sprint.status === 'active'"
        @submit="handleAddComment"
      />
    </div>
  </div>
</template>
