<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { loadSprint, loadCurrentSprintInfo, getClients } from '../services/dataLoader'
import SprintOverview from '../components/SprintOverview.vue'
import GoalDetail from '../components/GoalDetail.vue'
import AchievementsList from '../components/AchievementsList.vue'
import AllTasks from '../components/AllTasks.vue'
import NextSprintPlans from '../components/NextSprintPlans.vue'
import ClientFilter from '../components/ClientFilter.vue'
import ClientStats from '../components/ClientStats.vue'
import PdfExport from '../components/PdfExport.vue'
import { commitComment } from '../services/githubApi'

const route = useRoute()
const sprint = ref(null)
const loading = ref(true)
const error = ref(null)
const selectedGoal = ref(null)
const selectedClient = ref(null)
const activeTab = ref('overview')

const clients = computed(() => sprint.value ? getClients(sprint.value) : [])

const loadSprintData = async (sprintId) => {
  loading.value = true
  error.value = null
  selectedGoal.value = null

  try {
    let id = sprintId
    if (!id) {
      const currentInfo = await loadCurrentSprintInfo()
      id = currentInfo.currentSprintId
    }
    sprint.value = await loadSprint(id)
  } catch (err) {
    console.error('Failed to load sprint:', err)
    error.value = 'Nie udało się załadować danych sprintu'
  } finally {
    loading.value = false
  }
}

const handleSelectGoal = (goal) => {
  selectedGoal.value = goal
}

const handleCloseGoal = () => {
  selectedGoal.value = null
}

const handleAddComment = async ({ goalId, comment }) => {
  if (!sprint.value) return

  const goal = sprint.value.goals.find(g => g.id === goalId)
  if (!goal) return

  const newComment = {
    id: `c${Date.now()}`,
    text: comment.text,
    author: comment.author,
    createdAt: new Date().toISOString()
  }

  // Add comment locally
  goal.comments.push(newComment)

  // Try to commit to GitHub
  try {
    await commitComment(sprint.value.id, goalId, newComment)
  } catch (err) {
    console.error('Failed to commit comment:', err)
    // Comment is still added locally, will be synced later
  }
}

// Watch for route changes
watch(
  () => route.params.sprintId,
  (newId) => {
    loadSprintData(newId)
  },
  { immediate: true }
)

// Handle goal from route
watch(
  () => route.params.goalId,
  (goalId) => {
    if (goalId && sprint.value) {
      const goal = sprint.value.goals.find(g => g.id === parseInt(goalId))
      if (goal) selectedGoal.value = goal
    }
  }
)

onMounted(() => {
  if (route.params.goalId && sprint.value) {
    const goal = sprint.value.goals.find(g => g.id === parseInt(route.params.goalId))
    if (goal) selectedGoal.value = goal
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-500">Ładowanie sprintu...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 text-red-500">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-gray-900 font-medium">{{ error }}</p>
        <button
          @click="loadSprintData(route.params.sprintId)"
          class="mt-4 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>

    <!-- Sprint content -->
    <div v-else-if="sprint" class="p-6 lg:p-8">
      <!-- Header -->
      <header class="mb-6 flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{{ sprint.name }}</h1>
          <p class="mt-1 text-gray-500">Sprint Review</p>
        </div>

        <div class="flex items-center gap-3">
          <ClientFilter
            :clients="clients"
            v-model="selectedClient"
          />
          <PdfExport :sprint="sprint" />
        </div>
      </header>

      <!-- Tabs -->
      <nav class="mb-6 border-b border-gray-200">
        <div class="flex gap-6">
          <button
            @click="activeTab = 'overview'"
            class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'overview' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Przegląd
          </button>
          <button
            @click="activeTab = 'tasks'"
            class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'tasks' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Wszystkie zadania
          </button>
          <button
            @click="activeTab = 'stats'"
            class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'stats' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Statystyki klientów
          </button>
          <button
            @click="activeTab = 'next'"
            class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'next' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Następny sprint
          </button>
        </div>
      </nav>

      <!-- Tab content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Overview tab -->
        <template v-if="activeTab === 'overview'">
          <div class="lg:col-span-2 space-y-6">
            <SprintOverview
              :sprint="sprint"
              :selected-client="selectedClient"
              @select-goal="handleSelectGoal"
            />

            <AchievementsList
              :achievements="sprint.achievements"
              :selected-client="selectedClient"
            />
          </div>

          <div class="space-y-6">
            <GoalDetail
              v-if="selectedGoal"
              :goal="selectedGoal"
              :sprint="sprint"
              @close="handleCloseGoal"
              @add-comment="handleAddComment"
            />
            <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>Wybierz cel, aby zobaczyć szczegóły</p>
            </div>
          </div>
        </template>

        <!-- Tasks tab -->
        <template v-if="activeTab === 'tasks'">
          <div class="lg:col-span-3">
            <AllTasks :tasks="sprint.tasks" />
          </div>
        </template>

        <!-- Stats tab -->
        <template v-if="activeTab === 'stats'">
          <div class="lg:col-span-3">
            <ClientStats :sprint="sprint" />
          </div>
        </template>

        <!-- Next sprint tab -->
        <template v-if="activeTab === 'next'">
          <div class="lg:col-span-3">
            <NextSprintPlans
              :content="sprint.nextSprintPlans"
              :jira-timeline-url="sprint.jiraTimelineUrl"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
