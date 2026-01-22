<script setup>
import { computed } from 'vue'
import ProgressBar from './ProgressBar.vue'
import { pluralize, pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'

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

const emit = defineEmits(['selectGoal'])

const filteredSideGoals = computed(() => {
  if (!props.selectedClient) return props.sideGoals
  return props.sideGoals.filter(sg => sg.client === props.selectedClient)
})

const completedCount = computed(() =>
  filteredSideGoals.value.filter(sg => sg.completed).length
)

const allSideGoalsCompleted = computed(() =>
  props.sideGoals.length > 0 && props.sideGoals.every(sg => sg.completed)
)

const headerGradient = computed(() => {
  if (allSideGoalsCompleted.value) {
    // Wszystkie cele poboczne osiągnięte - zielony (jaśniejszy)
    return 'bg-gradient-to-r from-green-50 to-white'
  }
  if (props.sprint.status === 'active') {
    // Sprint aktywny, nie wszystkie cele - niebieski (jaśniejszy)
    return 'bg-gradient-to-r from-primary-50 to-white'
  }
  // Sprint zamknięty przed ukończeniem - czerwony (jaśniejszy)
  return 'bg-gradient-to-r from-red-50 to-white'
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-5 border-b border-gray-200" :class="headerGradient">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 capitalize">{{ pluralize(filteredSideGoals.length, POLISH_NOUNS.sideGoal) }}</h3>
        <span class="text-sm text-gray-500">
          {{ completedCount }}/{{ filteredSideGoals.length }} {{ pluralize(completedCount, POLISH_NOUNS.completed) }}
        </span>
      </div>
    </div>

    <!-- Goals list -->
    <div class="p-6">
      <div v-if="filteredSideGoals.length === 0" class="text-center py-8 text-gray-500">
        Brak celów pobocznych dla wybranego klienta
      </div>

      <div v-else class="space-y-3">
        <button
          v-for="sideGoal in filteredSideGoals"
          :key="sideGoal.id"
          @click="emit('selectGoal', { ...sideGoal, isSideGoal: true })"
          class="w-full text-left p-4 rounded-lg border transition-all group"
          :class="sideGoal.completed
            ? 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
            : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/50'"
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
                  class="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-primary-400"
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {{ pluralizeWithCount(sideGoal.tasks.length, POLISH_NOUNS.task) }}
                </span>
                <span v-if="sideGoal.comments && sideGoal.comments.length > 0" class="inline-flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  {{ sideGoal.comments.length }}
                </span>
              </div>
            </div>

            <div class="w-32 flex-shrink-0">
              <ProgressBar :task-stats="sideGoal.taskStats" size="sm" />
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
