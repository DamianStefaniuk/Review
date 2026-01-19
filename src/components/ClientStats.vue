<script setup>
import { computed } from 'vue'
import { getClientStats } from '../services/dataLoader'
import ProgressBar from './ProgressBar.vue'

const props = defineProps({
  sprint: {
    type: Object,
    required: true
  }
})

const stats = computed(() => getClientStats(props.sprint))

const clientList = computed(() => {
  return Object.entries(stats.value)
    .map(([name, data]) => ({
      name,
      ...data,
      progress: data.tasks > 0 ? Math.round((data.completedTasks / data.tasks) * 100) : 0
    }))
    .sort((a, b) => b.tasks - a.tasks)
})

const totalStats = computed(() => {
  return clientList.value.reduce(
    (acc, client) => ({
      goals: acc.goals + client.goals,
      tasks: acc.tasks + client.tasks,
      completedTasks: acc.completedTasks + client.completedTasks,
      achievements: acc.achievements + client.achievements
    }),
    { goals: 0, tasks: 0, completedTasks: 0, achievements: 0 }
  )
})
</script>

<template>
  <div class="space-y-6">
    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ Object.keys(stats).length }}</div>
        <div class="text-sm text-gray-500 mt-1">Klientów</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ totalStats.goals }}</div>
        <div class="text-sm text-gray-500 mt-1">Celów</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ totalStats.tasks }}</div>
        <div class="text-sm text-gray-500 mt-1">Zadań</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ totalStats.achievements }}</div>
        <div class="text-sm text-gray-500 mt-1">Osiągnięć</div>
      </div>
    </div>

    <!-- Client breakdown -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Statystyki per klient</h3>
      </div>

      <div class="divide-y divide-gray-100">
        <div
          v-for="client in clientList"
          :key="client.name"
          class="px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                {{ client.name.charAt(0) }}
              </div>
              <div>
                <h4 class="font-medium text-gray-900">{{ client.name }}</h4>
                <p class="text-sm text-gray-500">
                  {{ client.goals }} cele · {{ client.tasks }} zadań · {{ client.achievements }} osiągnięć
                </p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">{{ client.completedTasks }}/{{ client.tasks }}</div>
              <div class="text-xs text-gray-500">ukończonych</div>
            </div>
          </div>
          <ProgressBar :percent="client.progress" size="sm" />
        </div>
      </div>

      <div v-if="clientList.length === 0" class="p-8 text-center text-gray-500">
        Brak danych o klientach
      </div>
    </div>
  </div>
</template>
