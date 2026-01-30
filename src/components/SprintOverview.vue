<script setup>
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import { calculateSprintStats } from '../services/dataLoader'
import { pluralize, pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'

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

const baseStats = computed(() => calculateSprintStats(props.sprint))

// Obliczanie statystyk procentowych (jak w prezentacji)
const stats = computed(() => {
  if (!props.sprint) return null
  const base = baseStats.value

  // Zadania z celów głównych
  const mainGoalTaskKeys = new Set()
  props.sprint.goals.forEach(goal => {
    if (goal.tasks && Array.isArray(goal.tasks)) {
      goal.tasks.forEach(key => mainGoalTaskKeys.add(key))
    }
  })
  const mainGoalTasks = props.sprint.tasks.filter(task => mainGoalTaskKeys.has(task.key))
  const completedMainGoalTasks = mainGoalTasks.filter(task => task.status === 'Done').length
  const totalMainGoalTasks = mainGoalTasks.length

  // Zadania z celów pobocznych
  const sideGoalTaskKeys = new Set()
  const sideGoals = props.sprint.sideGoals || []
  sideGoals.forEach(sideGoal => {
    if (sideGoal.tasks && Array.isArray(sideGoal.tasks)) {
      sideGoal.tasks.forEach(key => sideGoalTaskKeys.add(key))
    }
  })
  const sideGoalTasks = props.sprint.tasks.filter(task => sideGoalTaskKeys.has(task.key))
  const completedSideGoalTasks = sideGoalTasks.filter(task => task.status === 'Done').length
  const totalSideGoalTasks = sideGoalTasks.length

  // Procent ukończenia sprintu (główne + poboczne)
  const totalSprintTasks = totalMainGoalTasks + totalSideGoalTasks
  const completedSprintTasks = completedMainGoalTasks + completedSideGoalTasks
  const sprintCompletionPercent = totalSprintTasks > 0
    ? Math.round((completedSprintTasks / totalSprintTasks) * 100)
    : 0

  // Procent ukończenia celów głównych
  const mainGoalsCompletionPercent = totalMainGoalTasks > 0
    ? Math.round((completedMainGoalTasks / totalMainGoalTasks) * 100)
    : 0

  // Procent ukończenia celów pobocznych
  const sideGoalsCompletionPercent = totalSideGoalTasks > 0
    ? Math.round((completedSideGoalTasks / totalSideGoalTasks) * 100)
    : 0

  return {
    ...base,
    // Liczby zadań
    completedMainGoalTasks,
    totalMainGoalTasks,
    completedSideGoalTasks,
    totalSideGoalTasks,
    completedSprintTasks,
    totalSprintTasks,
    // Procenty
    sprintCompletionPercent,
    mainGoalsCompletionPercent,
    sideGoalsCompletionPercent
  }
})

// Funkcja zwracająca kolor w zależności od statusu
const getProgressColor = (percent, isSprintClosed) => {
  if (percent === 100) {
    return 'text-green-600' // Ukończone
  }
  if (isSprintClosed) {
    return 'text-red-600' // Sprint zamknięty, nie ukończone
  }
  return 'text-blue-600' // W trakcie
}

const sprintProgressColor = computed(() =>
  getProgressColor(stats.value.sprintCompletionPercent, props.sprint.status === 'closed')
)

const mainGoalsProgressColor = computed(() =>
  getProgressColor(stats.value.mainGoalsCompletionPercent, props.sprint.status === 'closed')
)

const sideGoalsProgressColor = computed(() =>
  getProgressColor(stats.value.sideGoalsCompletionPercent, props.sprint.status === 'closed')
)

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

const allGoalsCompleted = computed(() =>
  stats.value.totalGoals > 0 && stats.value.completedGoals === stats.value.totalGoals
)

const headerGradient = computed(() => {
  if (allGoalsCompleted.value) {
    // Wszystkie cele główne osiągnięte - zielony (ciemniejszy)
    return 'bg-gradient-to-r from-green-100 to-white'
  }
  if (props.sprint.status === 'active') {
    // Sprint aktywny, nie wszystkie cele - niebieski (ciemniejszy)
    return 'bg-gradient-to-r from-primary-100 to-white'
  }
  // Sprint zamknięty przed ukończeniem - czerwony (ciemniejszy)
  return 'bg-gradient-to-r from-red-100 to-white'
})

</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-5 border-b border-gray-200" :class="headerGradient">
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
      </div>

      <!-- Trzy kolumny z procentami (jak w prezentacji) -->
      <div class="grid grid-cols-3 gap-4 mt-5">
        <!-- Sprint % -->
        <div class="bg-white/80 rounded-xl px-4 py-4 text-center">
          <div class="text-3xl font-bold" :class="sprintProgressColor">
            {{ stats.sprintCompletionPercent }}%
          </div>
          <div class="text-sm text-gray-600 mt-1">Sprint</div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ stats.completedSprintTasks }}/{{ stats.totalSprintTasks }} {{ pluralize(stats.totalSprintTasks, POLISH_NOUNS.task) }}
          </div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ stats.completedGoals + stats.completedSideGoals }}/{{ stats.totalGoals + stats.totalSideGoals }} {{ pluralize(stats.totalGoals + stats.totalSideGoals, POLISH_NOUNS.sprintGoal) }}
          </div>
        </div>

        <!-- Cele główne % -->
        <div class="bg-white/80 rounded-xl px-4 py-4 text-center">
          <div class="text-3xl font-bold" :class="mainGoalsProgressColor">
            {{ stats.mainGoalsCompletionPercent }}%
          </div>
          <div class="text-sm text-gray-600 mt-1 capitalize">{{ pluralize(stats.totalGoals, POLISH_NOUNS.goal) }}</div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ stats.completedMainGoalTasks }}/{{ stats.totalMainGoalTasks }} {{ pluralize(stats.totalMainGoalTasks, POLISH_NOUNS.task) }}
          </div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ stats.completedGoals }}/{{ stats.totalGoals }} {{ pluralize(stats.totalGoals, POLISH_NOUNS.goal) }}
          </div>
        </div>

        <!-- Cele poboczne % -->
        <div class="bg-white/80 rounded-xl px-4 py-4 text-center">
          <div class="text-3xl font-bold" :class="sideGoalsProgressColor">
            {{ stats.sideGoalsCompletionPercent }}%
          </div>
          <div class="text-sm text-gray-600 mt-1 capitalize">{{ pluralize(stats.totalSideGoals, POLISH_NOUNS.sideGoal) }}</div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ stats.completedSideGoalTasks }}/{{ stats.totalSideGoalTasks }} {{ pluralize(stats.totalSideGoalTasks, POLISH_NOUNS.task) }}
          </div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ stats.completedSideGoals }}/{{ stats.totalSideGoals }} {{ pluralize(stats.totalSideGoals, POLISH_NOUNS.sideGoal) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Goals list -->
    <div class="p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 capitalize">{{ pluralize(filteredGoals.length, POLISH_NOUNS.goal) }}</h3>

      <div v-if="filteredGoals.length === 0" class="text-center py-8 text-gray-500">
        Brak celów dla wybranego klienta
      </div>

      <div v-else class="space-y-3">
        <button
          v-for="goal in filteredGoals"
          :key="goal.id"
          @click="emit('selectGoal', goal)"
          class="w-full text-left p-4 rounded-lg border transition-all group"
          :class="goal.completed
            ? 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
            : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/50'"
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
