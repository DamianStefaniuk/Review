<script setup>
import { computed } from 'vue'

const props = defineProps({
  achievements: {
    type: Array,
    required: true
  },
  selectedClient: {
    type: String,
    default: null
  }
})

const filteredAchievements = computed(() => {
  if (!props.selectedClient) return props.achievements
  return props.achievements.filter(a => a.client === props.selectedClient)
})

const completedCount = computed(() =>
  filteredAchievements.value.filter(a => a.completed).length
)
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Osiągnięcia dodatkowe</h3>
        <span class="text-sm text-gray-500">
          {{ completedCount }}/{{ filteredAchievements.length }} ukończonych
        </span>
      </div>
    </div>

    <div v-if="filteredAchievements.length === 0" class="p-6 text-center text-gray-500">
      Brak osiągnięć dla wybranego klienta
    </div>

    <ul v-else class="divide-y divide-gray-100">
      <li
        v-for="achievement in filteredAchievements"
        :key="achievement.id"
        class="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
      >
        <span
          class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          :class="achievement.completed ? 'bg-green-500 text-white' : 'border-2 border-gray-300'"
        >
          <svg v-if="achievement.completed" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </span>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">{{ achievement.title }}</p>
        </div>

        <span
          v-if="achievement.client"
          class="flex-shrink-0 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
        >
          {{ achievement.client }}
        </span>
      </li>
    </ul>
  </div>
</template>
