<script setup>
import { computed, ref } from 'vue'
import { getClientStats, getTasksForGoal, getTasksForSideGoal } from '../services/dataLoader'
import ProgressBar from './ProgressBar.vue'
import { pluralize, pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'
import { getSafeJiraUrl } from '../utils/urlUtils'
import { getStatusLabel } from '../utils/statusMapping'

const props = defineProps({
  sprint: {
    type: Object,
    required: true
  }
})

// Stan rozwinięcia
const expandedClients = ref(new Set())
const expandedGoals = ref(new Set())
const sortBy = ref('status')

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

// Toggle klienta (pozwala na rozwinięcie wielu klientów jednocześnie)
const toggleClient = (clientName) => {
  const newSet = new Set(expandedClients.value)
  if (newSet.has(clientName)) {
    newSet.delete(clientName)
  } else {
    newSet.add(clientName)
  }
  expandedClients.value = newSet
}

// Unikalny klucz dla celu (łączy klienta, typ celu i ID, aby uniknąć konfliktów)
const getGoalKey = (clientName, goalId, isSideGoal = false) => {
  const type = isSideGoal ? 'side' : 'main'
  return `${clientName}::${type}::${goalId}`
}

// Sprawdź czy cel jest rozwinięty
const isGoalExpanded = (clientName, goalId, isSideGoal = false) => {
  return expandedGoals.value.has(getGoalKey(clientName, goalId, isSideGoal))
}

// Toggle pojedynczego celu
const toggleGoal = (clientName, goalId, isSideGoal = false) => {
  const key = getGoalKey(clientName, goalId, isSideGoal)
  const newSet = new Set(expandedGoals.value)
  if (newSet.has(key)) {
    newSet.delete(key)
  } else {
    newSet.add(key)
  }
  expandedGoals.value = newSet
}

// Cele klienta
const getClientGoals = (clientName) =>
  props.sprint.goals.filter(g => g.client === clientName)

const getClientSideGoals = (clientName) =>
  (props.sprint.sideGoals || []).filter(sg => sg.client === clientName)

// Sortowanie zadań (wzorowane na AllTasks.vue)
const statusOrder = { 'To Do': 3, 'In Progress': 2, 'Done': 1 }

const sortTasks = (tasks) => {
  return [...tasks].sort((a, b) => {
    if (sortBy.value === 'status') {
      const statusCompare = statusOrder[b.status] - statusOrder[a.status]
      if (statusCompare !== 0) return statusCompare
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
      return statusOrder[b.status] - statusOrder[a.status]
    }
    if (sortBy.value === 'assignee') {
      const hasAssigneeA = !!a.assignee
      const hasAssigneeB = !!b.assignee
      if (hasAssigneeA && !hasAssigneeB) return -1
      if (!hasAssigneeA && hasAssigneeB) return 1
      if (hasAssigneeA && hasAssigneeB) {
        const assigneeCompare = a.assignee.localeCompare(b.assignee)
        if (assigneeCompare !== 0) return assigneeCompare
      }
      return statusOrder[b.status] - statusOrder[a.status]
    }
    return 0
  })
}

const getSortedTasksForGoal = (goal, isSideGoal) => {
  const tasks = isSideGoal
    ? getTasksForSideGoal(props.sprint, goal)
    : getTasksForGoal(props.sprint, goal)
  return sortTasks(tasks)
}

// Grupowanie zadań po epicach (dla sortowania po epicach)
const getTasksByEpic = (goal, isSideGoal) => {
  const tasks = getSortedTasksForGoal(goal, isSideGoal)
  if (sortBy.value !== 'epic') return null

  const grouped = {}
  tasks.forEach(task => {
    const epic = task.epic || 'Inne'
    if (!grouped[epic]) grouped[epic] = []
    grouped[epic].push(task)
  })
  return grouped
}

// Gradient dla KLIENTA (zależny od ukończenia wszystkich jego zadań)
const getClientGradient = (client) => {
  const completionPercent = client.tasks > 0
    ? (client.completedTasks / client.tasks) * 100
    : 0

  if (completionPercent === 100) {
    return 'bg-gradient-to-r from-green-100 to-white'
  }
  if (props.sprint.status === 'closed' && completionPercent < 100) {
    return 'bg-gradient-to-r from-red-100 to-white'
  }
  return 'bg-gradient-to-r from-primary-100 to-white'
}

// Gradient dla CELU (cele główne -100, poboczne -50)
const getGoalGradient = (goal, isSideGoal = false) => {
  if (goal.completed) {
    return isSideGoal
      ? 'bg-gradient-to-r from-green-50 to-white'
      : 'bg-gradient-to-r from-green-100 to-white'
  }
  if (props.sprint.status === 'closed') {
    return isSideGoal
      ? 'bg-gradient-to-r from-red-50 to-white'
      : 'bg-gradient-to-r from-red-100 to-white'
  }
  return isSideGoal
    ? 'bg-gradient-to-r from-primary-50 to-white'
    : 'bg-gradient-to-r from-primary-100 to-white'
}

const statusColors = {
  'Done': 'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'To Do': 'bg-gray-100 text-gray-600'
}
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
        <div class="text-sm text-gray-500 mt-1 capitalize">{{ pluralize(totalStats.goals, POLISH_NOUNS.goal) }}</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ totalStats.sideGoals }}</div>
        <div class="text-sm text-gray-500 mt-1 capitalize">{{ pluralize(totalStats.sideGoals, POLISH_NOUNS.sideGoal) }}</div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div class="text-3xl font-bold text-gray-900">{{ totalStats.tasks }}</div>
        <div class="text-sm text-gray-500 mt-1 capitalize">{{ pluralize(totalStats.tasks, POLISH_NOUNS.task) }}</div>
      </div>
    </div>

    <!-- Client breakdown -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Statystyki per klient</h3>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">Sortuj zadania:</span>
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

      <div class="divide-y divide-gray-100">
        <div
          v-for="client in clientList"
          :key="client.name"
        >
          <!-- Klient - klikalny nagłówek -->
          <button
            @click="toggleClient(client.name)"
            class="w-full px-6 py-4 transition-colors hover:bg-gray-50 text-left"
            :class="getClientGradient(client)"
          >
            <div class="flex items-center justify-between mb-3">
              <div>
                <h4 class="font-medium text-gray-900">{{ client.name }}</h4>
                <p class="text-sm text-gray-500">
                  {{ pluralizeWithCount(client.goals, POLISH_NOUNS.goal) }} · {{ pluralizeWithCount(client.sideGoals, POLISH_NOUNS.sideGoal) }} · {{ pluralizeWithCount(client.tasks, POLISH_NOUNS.task) }}
                </p>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <div class="text-lg font-semibold text-gray-900">{{ client.completedTasks }}/{{ client.tasks }}</div>
                  <div class="text-xs text-gray-500">ukończonych</div>
                </div>
                <svg
                  class="w-5 h-5 text-gray-400 transition-transform duration-200"
                  :class="{ 'rotate-180': expandedClients.has(client.name) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <ProgressBar :task-stats="client.taskStats" size="sm" />
          </button>

          <!-- Rozwinięta sekcja klienta -->
          <div v-if="expandedClients.has(client.name)" class="bg-gray-50 px-6 py-4 space-y-4">
            <!-- CELE GŁÓWNE -->
            <div v-if="getClientGoals(client.name).length > 0">
              <h5 class="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Cele Główne</h5>
              <div class="space-y-2">
                <div v-for="goal in getClientGoals(client.name)" :key="goal.id">
                  <!-- Cel - klikalny element -->
                  <button
                    @click="toggleGoal(client.name, goal.id, false)"
                    class="w-full p-3 rounded-lg border transition-all text-left"
                    :class="getGoalGradient(goal, false)"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
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
                          class="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300"
                        ></span>
                        <span class="font-medium text-gray-900 truncate">{{ goal.title }}</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <div class="w-20 sm:w-32">
                          <ProgressBar :task-stats="goal.taskStats" size="sm" />
                        </div>
                        <svg
                          class="w-4 h-4 text-gray-400 transition-transform duration-200"
                          :class="{ 'rotate-180': isGoalExpanded(client.name, goal.id, false) }"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  <!-- Zadania pod celem - grupowane po epicach -->
                  <div v-if="isGoalExpanded(client.name, goal.id, false)" class="mt-2 ml-7">
                    <!-- Widok z grupami epiców -->
                    <template v-if="getTasksByEpic(goal, false)">
                      <div v-for="(epicTasks, epicName) in getTasksByEpic(goal, false)" :key="epicName">
                        <div class="px-2 py-1.5 bg-gray-200 rounded text-xs font-medium text-gray-600 mb-1">
                          {{ epicName }}
                        </div>
                        <div class="space-y-1 mb-2">
                          <a
                            v-for="task in epicTasks"
                            :key="task.key"
                            :href="getSafeJiraUrl(sprint.jiraBaseUrl, task.key)"
                            :target="getSafeJiraUrl(sprint.jiraBaseUrl, task.key) ? '_blank' : undefined"
                            :rel="getSafeJiraUrl(sprint.jiraBaseUrl, task.key) ? 'noopener noreferrer' : undefined"
                            class="flex items-center gap-3 p-2 rounded hover:bg-white transition-colors"
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
                              <p class="text-sm text-gray-900 truncate">{{ task.summary }}</p>
                            </div>
                            <span v-if="task.assignee" class="text-xs text-gray-500 flex-shrink-0">{{ task.assignee }}</span>
                            <span
                              class="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full"
                              :class="statusColors[task.status]"
                            >
                              {{ getStatusLabel(task.status) }}
                            </span>
                          </a>
                        </div>
                      </div>
                    </template>
                    <!-- Widok płaski (bez grupowania) -->
                    <template v-else>
                      <div class="space-y-1">
                        <a
                          v-for="task in getSortedTasksForGoal(goal, false)"
                          :key="task.key"
                          :href="getSafeJiraUrl(sprint.jiraBaseUrl, task.key)"
                          :target="getSafeJiraUrl(sprint.jiraBaseUrl, task.key) ? '_blank' : undefined"
                          :rel="getSafeJiraUrl(sprint.jiraBaseUrl, task.key) ? 'noopener noreferrer' : undefined"
                          class="flex items-center gap-3 p-2 rounded hover:bg-white transition-colors"
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
                            <p class="text-sm text-gray-900 truncate">{{ task.summary }}</p>
                          </div>
                          <span v-if="task.assignee" class="text-xs text-gray-500 flex-shrink-0">{{ task.assignee }}</span>
                          <span
                            class="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full"
                            :class="statusColors[task.status]"
                          >
                            {{ getStatusLabel(task.status) }}
                          </span>
                        </a>
                      </div>
                    </template>
                    <div v-if="getSortedTasksForGoal(goal, false).length === 0" class="text-sm text-gray-400 py-2">
                      Brak zadań
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- CELE POBOCZNE -->
            <div v-if="getClientSideGoals(client.name).length > 0">
              <h5 class="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Cele Poboczne</h5>
              <div class="space-y-2">
                <div v-for="sideGoal in getClientSideGoals(client.name)" :key="sideGoal.id">
                  <!-- Cel poboczny - klikalny element -->
                  <button
                    @click="toggleGoal(client.name, sideGoal.id, true)"
                    class="w-full p-3 rounded-lg border transition-all text-left"
                    :class="getGoalGradient(sideGoal, true)"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
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
                          class="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300"
                        ></span>
                        <span class="font-medium text-gray-900 truncate">{{ sideGoal.title }}</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <div class="w-20 sm:w-32">
                          <ProgressBar :task-stats="sideGoal.taskStats" size="sm" />
                        </div>
                        <svg
                          class="w-4 h-4 text-gray-400 transition-transform duration-200"
                          :class="{ 'rotate-180': isGoalExpanded(client.name, sideGoal.id, true) }"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  <!-- Zadania pod celem pobocznym - grupowane po epicach -->
                  <div v-if="isGoalExpanded(client.name, sideGoal.id, true)" class="mt-2 ml-7">
                    <!-- Widok z grupami epiców -->
                    <template v-if="getTasksByEpic(sideGoal, true)">
                      <div v-for="(epicTasks, epicName) in getTasksByEpic(sideGoal, true)" :key="epicName">
                        <div class="px-2 py-1.5 bg-gray-200 rounded text-xs font-medium text-gray-600 mb-1">
                          {{ epicName }}
                        </div>
                        <div class="space-y-1 mb-2">
                          <a
                            v-for="task in epicTasks"
                            :key="task.key"
                            :href="getSafeJiraUrl(sprint.jiraBaseUrl, task.key)"
                            :target="getSafeJiraUrl(sprint.jiraBaseUrl, task.key) ? '_blank' : undefined"
                            :rel="getSafeJiraUrl(sprint.jiraBaseUrl, task.key) ? 'noopener noreferrer' : undefined"
                            class="flex items-center gap-3 p-2 rounded hover:bg-white transition-colors"
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
                              <p class="text-sm text-gray-900 truncate">{{ task.summary }}</p>
                            </div>
                            <span v-if="task.assignee" class="text-xs text-gray-500 flex-shrink-0">{{ task.assignee }}</span>
                            <span
                              class="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full"
                              :class="statusColors[task.status]"
                            >
                              {{ getStatusLabel(task.status) }}
                            </span>
                          </a>
                        </div>
                      </div>
                    </template>
                    <!-- Widok płaski (bez grupowania) -->
                    <template v-else>
                      <div class="space-y-1">
                        <a
                          v-for="task in getSortedTasksForGoal(sideGoal, true)"
                          :key="task.key"
                          :href="getSafeJiraUrl(sprint.jiraBaseUrl, task.key)"
                          :target="getSafeJiraUrl(sprint.jiraBaseUrl, task.key) ? '_blank' : undefined"
                          :rel="getSafeJiraUrl(sprint.jiraBaseUrl, task.key) ? 'noopener noreferrer' : undefined"
                          class="flex items-center gap-3 p-2 rounded hover:bg-white transition-colors"
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
                            <p class="text-sm text-gray-900 truncate">{{ task.summary }}</p>
                          </div>
                          <span v-if="task.assignee" class="text-xs text-gray-500 flex-shrink-0">{{ task.assignee }}</span>
                          <span
                            class="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full"
                            :class="statusColors[task.status]"
                          >
                            {{ getStatusLabel(task.status) }}
                          </span>
                        </a>
                      </div>
                    </template>
                    <div v-if="getSortedTasksForGoal(sideGoal, true).length === 0" class="text-sm text-gray-400 py-2">
                      Brak zadań
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Brak celów -->
            <div v-if="getClientGoals(client.name).length === 0 && getClientSideGoals(client.name).length === 0" class="text-center py-4 text-gray-500">
              Brak celów dla tego klienta
            </div>
          </div>
        </div>
      </div>

      <div v-if="clientList.length === 0" class="p-8 text-center text-gray-500">
        Brak danych o klientach
      </div>
    </div>
  </div>
</template>
