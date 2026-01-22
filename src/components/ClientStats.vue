<script setup>
import { computed } from 'vue'
import { getClientStats } from '../services/dataLoader'
import ProgressBar from './ProgressBar.vue'
import { pluralize, pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'

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
      goals: data.goals || 0,
      tasks: data.tasks || 0,
      completedTasks: data.completedTasks || 0,
      inProgressTasks: data.inProgressTasks || 0,
      todoTasks: data.todoTasks || 0,
      sideGoals: data.sideGoals || 0,
      taskStats: {
        done: data.completedTasks || 0,
        inProgress: data.inProgressTasks || 0,
        todo: data.todoTasks || 0,
        total: data.tasks || 0
      }
    }))
    .sort((a, b) => b.tasks - a.tasks)
})

const totalStats = computed(() => {
  return clientList.value.reduce(
    (acc, client) => ({
      goals: acc.goals + client.goals,
      tasks: acc.tasks + client.tasks,
      completedTasks: acc.completedTasks + client.completedTasks,
      sideGoals: acc.sideGoals + client.sideGoals
    }),
    { goals: 0, tasks: 0, completedTasks: 0, sideGoals: 0 }
  )
})
</script>

<template>
  <div class="space-y-6">
    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ Object.keys(stats).length }}</div>
        <div class="text-sm text-gray-500 mt-1 capitalize">{{ pluralize(Object.keys(stats).length, POLISH_NOUNS.client) }}</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ totalStats.goals }}</div>
        <div class="text-sm text-gray-500 mt-1">{{ pluralize(totalStats.goals, POLISH_NOUNS.goal) }}</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ totalStats.sideGoals }}</div>
        <div class="text-sm text-gray-500 mt-1">{{ pluralize(totalStats.sideGoals, POLISH_NOUNS.sideGoal) }}</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ totalStats.tasks }}</div>
        <div class="text-sm text-gray-500 mt-1">{{ pluralize(totalStats.tasks, POLISH_NOUNS.task) }}</div>
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
                  {{ pluralizeWithCount(client.goals, POLISH_NOUNS.goal) }} · {{ pluralizeWithCount(client.sideGoals, POLISH_NOUNS.sideGoal) }} · {{ pluralizeWithCount(client.tasks, POLISH_NOUNS.task) }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">{{ client.completedTasks }}/{{ client.tasks }}</div>
              <div class="text-xs text-gray-500">ukończonych</div>
            </div>
          </div>
          <ProgressBar :task-stats="client.taskStats" size="sm" />
        </div>
      </div>

      <div v-if="clientList.length === 0" class="p-8 text-center text-gray-500">
        Brak danych o klientach
      </div>
    </div>
  </div>
</template>
