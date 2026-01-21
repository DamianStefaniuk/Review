<script setup>
import { ref, computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import { getTasksForSideGoal } from '../services/dataLoader'
import { pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'

const props = defineProps({
  sideGoals: {
    type: Array,
    required: true
  },
  sprint: {
    type: Object,
    required: true
  },
  selectedClient: {
    type: String,
    default: null
  }
})

const expandedGoalId = ref(null)

const filteredSideGoals = computed(() => {
  if (!props.selectedClient) return props.sideGoals
  return props.sideGoals.filter(sg => sg.client === props.selectedClient)
})

const completedCount = computed(() =>
  filteredSideGoals.value.filter(sg => sg.completed).length
)

const toggleGoal = (goalId) => {
  expandedGoalId.value = expandedGoalId.value === goalId ? null : goalId
}

const getTasksForGoal = (sideGoal) => {
  return getTasksForSideGoal(props.sprint, sideGoal)
}

const tasksByStatus = (sideGoal) => {
  const tasks = getTasksForGoal(sideGoal)
  return {
    'Done': tasks.filter(t => t.status === 'Done'),
    'In Progress': tasks.filter(t => t.status === 'In Progress'),
    'To Do': tasks.filter(t => t.status === 'To Do')
  }
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Cele poboczne</h3>
        <span class="text-sm text-gray-500">
          {{ completedCount }}/{{ filteredSideGoals.length }} ukonczone
        </span>
      </div>
    </div>

    <div v-if="filteredSideGoals.length === 0" class="p-6 text-center text-gray-500">
      Brak celow pobocznych dla wybranego klienta
    </div>

    <div v-else class="divide-y divide-gray-100">
      <div
        v-for="sideGoal in filteredSideGoals"
        :key="sideGoal.id"
        class="hover:bg-gray-50 transition-colors"
      >
        <!-- Side Goal Header -->
        <button
          @click="toggleGoal(sideGoal.id)"
          class="w-full text-left px-6 py-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span
                  v-if="sideGoal.completed"
                  class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </span>
                <span
                  v-else
                  class="flex-shrink-0 w-5 h-5 rounded-full border-2 border-amber-400"
                ></span>
                <h4 class="font-medium text-gray-900 truncate">{{ sideGoal.title }}</h4>
              </div>

              <div class="flex items-center gap-3 text-sm text-gray-500 ml-7">
                <span v-if="sideGoal.client" class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {{ sideGoal.client }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {{ sideGoal.tag }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {{ pluralizeWithCount(sideGoal.tasks.length, POLISH_NOUNS.task) }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-24">
                <ProgressBar :percent="sideGoal.completionPercent" size="sm" color="amber" />
              </div>
              <svg
                class="w-5 h-5 text-gray-400 transition-transform"
                :class="{ 'rotate-180': expandedGoalId === sideGoal.id }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        <!-- Expanded Tasks -->
        <div
          v-if="expandedGoalId === sideGoal.id"
          class="px-6 pb-4 border-t border-gray-100 bg-gray-50"
        >
          <div class="pt-4 space-y-3">
            <!-- Done tasks -->
            <div v-if="tasksByStatus(sideGoal)['Done'].length > 0">
              <h5 class="text-xs font-medium text-gray-500 mb-2">Ukonczone</h5>
              <div class="space-y-1">
                <a
                  v-for="task in tasksByStatus(sideGoal)['Done']"
                  :key="task.key"
                  :href="sprint.jiraBaseUrl ? sprint.jiraBaseUrl + '/browse/' + task.key : undefined"
                  :target="sprint.jiraBaseUrl ? '_blank' : undefined"
                  :rel="sprint.jiraBaseUrl ? 'noopener noreferrer' : undefined"
                  class="flex items-center gap-2 p-2 bg-green-50 rounded text-sm hover:bg-green-100 transition-colors"
                >
                  <span class="flex-shrink-0 w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </span>
                  <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                  <span class="text-gray-900 truncate">{{ task.summary }}</span>
                </a>
              </div>
            </div>

            <!-- In Progress tasks -->
            <div v-if="tasksByStatus(sideGoal)['In Progress'].length > 0">
              <h5 class="text-xs font-medium text-gray-500 mb-2">W trakcie</h5>
              <div class="space-y-1">
                <a
                  v-for="task in tasksByStatus(sideGoal)['In Progress']"
                  :key="task.key"
                  :href="sprint.jiraBaseUrl ? sprint.jiraBaseUrl + '/browse/' + task.key : undefined"
                  :target="sprint.jiraBaseUrl ? '_blank' : undefined"
                  :rel="sprint.jiraBaseUrl ? 'noopener noreferrer' : undefined"
                  class="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm hover:bg-blue-100 transition-colors"
                >
                  <span class="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  </span>
                  <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                  <span class="text-gray-900 truncate">{{ task.summary }}</span>
                </a>
              </div>
            </div>

            <!-- To Do tasks -->
            <div v-if="tasksByStatus(sideGoal)['To Do'].length > 0">
              <h5 class="text-xs font-medium text-gray-500 mb-2">Do zrobienia</h5>
              <div class="space-y-1">
                <a
                  v-for="task in tasksByStatus(sideGoal)['To Do']"
                  :key="task.key"
                  :href="sprint.jiraBaseUrl ? sprint.jiraBaseUrl + '/browse/' + task.key : undefined"
                  :target="sprint.jiraBaseUrl ? '_blank' : undefined"
                  :rel="sprint.jiraBaseUrl ? 'noopener noreferrer' : undefined"
                  class="flex items-center gap-2 p-2 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  <span class="flex-shrink-0 w-4 h-4 rounded-full border-2 border-gray-300"></span>
                  <span class="text-xs font-mono text-gray-500">{{ task.key }}</span>
                  <span class="text-gray-900 truncate">{{ task.summary }}</span>
                </a>
              </div>
            </div>

            <div v-if="sideGoal.tasks.length === 0" class="text-sm text-gray-500 text-center py-2">
              Brak przypisanych zadan
            </div>
          </div>

          <!-- Comments -->
          <div v-if="sideGoal.comments && sideGoal.comments.length > 0" class="mt-4 pt-4 border-t border-gray-200">
            <h5 class="text-xs font-medium text-gray-500 mb-2">Komentarze</h5>
            <div class="space-y-2">
              <div
                v-for="comment in sideGoal.comments"
                :key="comment.id"
                class="p-2 bg-amber-50 rounded text-sm"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="font-medium text-gray-900">{{ comment.author }}</span>
                  <span class="text-xs text-gray-500">{{ new Date(comment.createdAt).toLocaleDateString('pl-PL') }}</span>
                </div>
                <p class="text-gray-700">{{ comment.text }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
