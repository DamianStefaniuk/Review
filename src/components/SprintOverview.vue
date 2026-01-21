<script setup>
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import { calculateSprintStats } from '../services/dataLoader'
import { pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'

const props = defineProps({
  sprint: {
    type: Object,
    required: true
  },
  selectedClient: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['selectGoal'])

const filteredGoals = computed(() => {
  if (!props.selectedClient) return props.sprint.goals
  return props.sprint.goals.filter(g => g.client === props.selectedClient)
})

const stats = computed(() => calculateSprintStats(props.sprint))

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const statusBadge = computed(() => {
  if (props.sprint.status === 'active') {
    return { text: 'Aktywny', class: 'bg-green-100 text-green-700' }
  }
  return { text: 'Zamknięty', class: 'bg-gray-100 text-gray-600' }
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-white">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold text-gray-900">{{ sprint.name }}</h2>
            <span
              class="px-2.5 py-1 text-xs font-medium rounded-full"
              :class="statusBadge.class"
            >
              {{ statusBadge.text }}
            </span>
          </div>
          <p class="mt-1 text-sm text-gray-500">
            {{ formatDate(sprint.startDate) }} - {{ formatDate(sprint.endDate) }}
          </p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-bold text-primary-600">{{ stats.avgProgress }}%</div>
          <div class="text-sm text-gray-500">średni postęp</div>
        </div>
      </div>

      <!-- Quick stats -->
      <div class="grid grid-cols-3 gap-4 mt-5">
        <div class="bg-white/60 rounded-lg px-4 py-3">
          <div class="text-2xl font-semibold text-gray-900">
            {{ stats.completedGoals }}/{{ stats.totalGoals }}
          </div>
          <div class="text-sm text-gray-500">Cele glowne</div>
        </div>
        <div class="bg-white/60 rounded-lg px-4 py-3">
          <div class="text-2xl font-semibold text-gray-900">
            {{ stats.completedTasks }}/{{ stats.totalTasks }}
          </div>
          <div class="text-sm text-gray-500">Zadania</div>
        </div>
        <div class="bg-white/60 rounded-lg px-4 py-3">
          <div class="text-2xl font-semibold text-gray-900">
            {{ stats.completedSideGoals }}/{{ stats.totalSideGoals }}
          </div>
          <div class="text-sm text-gray-500">Cele poboczne</div>
        </div>
      </div>
    </div>

    <!-- Goals list -->
    <div class="p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Cele sprintu</h3>

      <div v-if="filteredGoals.length === 0" class="text-center py-8 text-gray-500">
        Brak celów dla wybranego klienta
      </div>

      <div v-else class="space-y-3">
        <button
          v-for="goal in filteredGoals"
          :key="goal.id"
          @click="emit('selectGoal', goal)"
          class="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
          :class="{ 'bg-green-50 border-green-200': goal.completed }"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span
                  v-if="goal.completed"
                  class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </span>
                <span
                  v-else
                  class="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-primary-400"
                ></span>
                <h4 class="font-medium text-gray-900 truncate">{{ goal.title }}</h4>
              </div>

              <div class="flex items-center gap-3 text-sm text-gray-500 ml-7">
                <span v-if="goal.client" class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {{ goal.client }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {{ pluralizeWithCount(goal.tasks.length, POLISH_NOUNS.task) }}
                </span>
                <span v-if="goal.comments.length > 0" class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  {{ goal.comments.length }}
                </span>
              </div>
            </div>

            <div class="w-32 flex-shrink-0">
              <ProgressBar :task-stats="goal.taskStats" size="sm" />
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
