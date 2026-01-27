<script setup>
import { computed, ref } from 'vue'
import { getSafeJiraUrl } from '../utils/urlUtils'
import { getStatusLabel } from '../utils/statusMapping'
import { pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  },
  jiraBaseUrl: {
    type: String,
    default: ''
  }
})

const sortBy = ref('status')
const filterStatus = ref('all')

const statusOrder = {
  'To Do': 3,
  'In Progress': 2,
  'Done': 1
}

const sortedTasks = computed(() => {
  let filtered = [...props.tasks]

  // Filter by status
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(t => t.status === filterStatus.value)
  }

  // Sort
  return filtered.sort((a, b) => {
    if (sortBy.value === 'status') {
      const statusCompare = statusOrder[b.status] - statusOrder[a.status]
      if (statusCompare !== 0) return statusCompare
      // Within same status, tasks with assignee come first (sorted alphabetically)
      const hasAssigneeA = !!a.assignee
      const hasAssigneeB = !!b.assignee
      if (hasAssigneeA && !hasAssigneeB) return -1
      if (!hasAssigneeA && hasAssigneeB) return 1
      if (hasAssigneeA && hasAssigneeB) {
        return a.assignee.localeCompare(b.assignee)
      }
      return 0
    }
    if (sortBy.value === 'epic') {
      const epicA = a.epic || 'zzz'
      const epicB = b.epic || 'zzz'
      const epicCompare = epicA.localeCompare(epicB)
      if (epicCompare !== 0) return epicCompare
      // Within same epic, sort by status
      return statusOrder[b.status] - statusOrder[a.status]
    }
    if (sortBy.value === 'assignee') {
      // Tasks with assignee come first, sorted alphabetically
      // Tasks without assignee come last
      const hasAssigneeA = !!a.assignee
      const hasAssigneeB = !!b.assignee

      if (hasAssigneeA && !hasAssigneeB) return -1
      if (!hasAssigneeA && hasAssigneeB) return 1

      if (hasAssigneeA && hasAssigneeB) {
        // Both have assignees - sort by assignee name, then by status
        const assigneeCompare = a.assignee.localeCompare(b.assignee)
        if (assigneeCompare !== 0) return assigneeCompare
      }

      // Within same assignee (or both without), sort by status
      return statusOrder[b.status] - statusOrder[a.status]
    }
    return 0
  })
})

const tasksByEpic = computed(() => {
  if (sortBy.value !== 'epic') return null

  const grouped = {}
  sortedTasks.value.forEach(task => {
    const epic = task.epic || 'Inne'
    if (!grouped[epic]) grouped[epic] = []
    grouped[epic].push(task)
  })
  return grouped
})

const statusCounts = computed(() => {
  const counts = { 'Done': 0, 'In Progress': 0, 'To Do': 0 }
  props.tasks.forEach(t => {
    if (counts[t.status] !== undefined) counts[t.status]++
  })
  return counts
})

const statusColors = {
  'Done': 'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'To Do': 'bg-gray-100 text-gray-600'
}

const statusIcons = {
  'Done': `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`,
  'In Progress': `<span class="w-2 h-2 bg-current rounded-full animate-pulse"></span>`,
  'To Do': ''
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 capitalize">
          {{ pluralizeWithCount(tasks.length, POLISH_NOUNS.task) }}
        </h3>
      </div>

      <!-- Filters and sorting -->
      <div class="flex flex-wrap items-center gap-4">
        <!-- Status filter -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">Filtruj:</span>
          <div class="flex gap-1">
            <button
              @click="filterStatus = 'all'"
              class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              :class="filterStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              Wszystkie
            </button>
            <button
              @click="filterStatus = 'Done'"
              class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              :class="filterStatus === 'Done' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'"
            >
              {{ getStatusLabel('Done') }} ({{ statusCounts['Done'] }})
            </button>
            <button
              @click="filterStatus = 'In Progress'"
              class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              :class="filterStatus === 'In Progress' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'"
            >
              {{ getStatusLabel('In Progress') }} ({{ statusCounts['In Progress'] }})
            </button>
            <button
              @click="filterStatus = 'To Do'"
              class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              :class="filterStatus === 'To Do' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              {{ getStatusLabel('To Do') }} ({{ statusCounts['To Do'] }})
            </button>
          </div>
        </div>

        <!-- Sort -->
        <div class="flex items-center gap-2 ml-auto">
          <span class="text-sm text-gray-500">Sortuj:</span>
          <select
            v-model="sortBy"
            class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="status">Status</option>
            <option value="epic">Epic</option>
            <option value="assignee">Osoba</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Task list grouped by epic -->
    <div v-if="tasksByEpic" class="divide-y divide-gray-100">
      <div v-for="(epicTasks, epicName) in tasksByEpic" :key="epicName">
        <div class="px-6 py-3 bg-gray-50">
          <h4 class="text-sm font-medium text-gray-700">{{ epicName }}</h4>
        </div>
        <ul class="divide-y divide-gray-50">
          <li
            v-for="task in epicTasks"
            :key="task.key"
          >
            <a
              :href="getSafeJiraUrl(jiraBaseUrl, task.key)"
              :target="getSafeJiraUrl(jiraBaseUrl, task.key) ? '_blank' : undefined"
              :rel="getSafeJiraUrl(jiraBaseUrl, task.key) ? 'noopener noreferrer' : undefined"
              class="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <span
                class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                :class="task.status === 'Done' ? 'bg-green-500 text-white' : task.status === 'In Progress' ? 'bg-blue-500 text-white' : 'border-2 border-gray-300'"
              >
                <svg v-if="task.status === 'Done'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else-if="task.status === 'In Progress'" class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              </span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-mono text-gray-400">{{ task.key }}</span>
                <p class="text-sm text-gray-900">{{ task.summary }}</p>
              </div>
              <span v-if="task.assignee" class="text-xs text-gray-500">{{ task.assignee }}</span>
              <span
                class="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full"
                :class="statusColors[task.status]"
              >
                {{ getStatusLabel(task.status) }}
              </span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- Task list flat -->
    <ul v-else class="divide-y divide-gray-100">
      <li
        v-for="task in sortedTasks"
        :key="task.key"
      >
        <a
          :href="getSafeJiraUrl(jiraBaseUrl, task.key)"
          :target="getSafeJiraUrl(jiraBaseUrl, task.key) ? '_blank' : undefined"
          :rel="getSafeJiraUrl(jiraBaseUrl, task.key) ? 'noopener noreferrer' : undefined"
          class="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
        >
          <span
            class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
            :class="task.status === 'Done' ? 'bg-green-500 text-white' : task.status === 'In Progress' ? 'bg-blue-500 text-white' : 'border-2 border-gray-300'"
          >
            <svg v-if="task.status === 'Done'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span v-else-if="task.status === 'In Progress'" class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          </span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-gray-400">{{ task.key }}</span>
              <span v-if="task.epic" class="text-xs text-gray-400">{{ task.epic }}</span>
            </div>
            <p class="text-sm text-gray-900">{{ task.summary }}</p>
          </div>
          <span v-if="task.assignee" class="text-xs text-gray-500">{{ task.assignee }}</span>
          <span
            class="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full"
            :class="statusColors[task.status]"
          >
            {{ getStatusLabel(task.status) }}
          </span>
        </a>
      </li>
    </ul>

    <!-- Empty state -->
    <div v-if="sortedTasks.length === 0" class="p-8 text-center text-gray-500">
      Brak zadań do wyświetlenia
    </div>
  </div>
</template>
