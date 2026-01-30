<script setup>
import { ref, watch, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { loadSprint, loadCurrentSprintInfo } from '../services/dataLoader'
import { isRepoDataConfigured } from '../services/repoDataService'
import { useAuthStore } from '../stores/authStore'
import { useOperationQueue } from '../composables/useOperationQueue'
import SprintOverview from '../components/SprintOverview.vue'
import GoalDetail from '../components/GoalDetail.vue'
import SideGoalsList from '../components/SideGoalsList.vue'
import AchievementsList from '../components/AchievementsList.vue'
import AllTasks from '../components/AllTasks.vue'
import NextSprintPlans from '../components/NextSprintPlans.vue'
import ClientStats from '../components/ClientStats.vue'
import JiraSyncButton from '../components/JiraSyncButton.vue'
import CloseSprintButton from '../components/CloseSprintButton.vue'
import DataRepoStatus from '../components/DataRepoStatus.vue'
import MediaManager from '../components/MediaManager.vue'
import PresentationSetup from '../components/PresentationSetup.vue'

const authStore = useAuthStore()
const refreshSidebar = inject('refreshSidebar', () => {})
const { queueAddComment, queueUpdateComment, queueDeleteComment } = useOperationQueue()

const route = useRoute()
const sprint = ref(null)
const loading = ref(true)
const error = ref(null)
const selectedGoal = ref(null)
const activeTab = ref('overview')
const refreshKey = ref(0)

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

const handleAddComment = async ({ goalId, comment, isSideGoal }) => {
  if (!sprint.value) return

  // Find goal in main goals or side goals
  let goal
  if (isSideGoal) {
    goal = sprint.value.sideGoals?.find(g => g.id === goalId)
  } else {
    goal = sprint.value.goals.find(g => g.id === goalId)
  }
  if (!goal) return

  const newComment = {
    id: `c${Date.now()}`,
    text: comment.text,
    createdAt: new Date().toISOString()
  }

  // Initialize comments array if needed
  if (!goal.comments) {
    goal.comments = []
  }

  // Add comment locally (at the beginning for newest first)
  goal.comments.unshift(newComment)

  // Try to save to Repository if configured
  if (isRepoDataConfigured()) {
    try {
      await queueAddComment(sprint.value.id, goalId, newComment, isSideGoal)
    } catch (err) {
      console.error('Failed to save comment to Repository:', err)
      // Comment is still added locally
    }
  }
}

const handleUpdateComment = async ({ goalId, commentId, updatedComment, isSideGoal }) => {
  if (!sprint.value) return

  // Find goal in main goals or side goals
  let goal
  if (isSideGoal) {
    goal = sprint.value.sideGoals?.find(g => g.id === goalId)
  } else {
    goal = sprint.value.goals.find(g => g.id === goalId)
  }
  if (!goal) return

  // Find and update comment locally
  const commentIndex = goal.comments?.findIndex(c => c.id === commentId)
  if (commentIndex === -1 || commentIndex === undefined) return

  goal.comments[commentIndex] = {
    ...goal.comments[commentIndex],
    text: updatedComment.text,
    updatedAt: new Date().toISOString()
  }

  // Try to save to Repository if configured
  if (isRepoDataConfigured()) {
    try {
      await queueUpdateComment(sprint.value.id, goalId, commentId, updatedComment, isSideGoal)
    } catch (err) {
      console.error('Failed to update comment in Repository:', err)
    }
  }
}

const handleDeleteComment = async ({ goalId, commentId, isSideGoal }) => {
  if (!sprint.value) return

  // Find goal in main goals or side goals
  let goal
  if (isSideGoal) {
    goal = sprint.value.sideGoals?.find(g => g.id === goalId)
  } else {
    goal = sprint.value.goals.find(g => g.id === goalId)
  }
  if (!goal) return

  // Find and remove comment locally
  const commentIndex = goal.comments?.findIndex(c => c.id === commentId)
  if (commentIndex === -1 || commentIndex === undefined) return

  goal.comments.splice(commentIndex, 1)

  // Try to save to Repository if configured
  if (isRepoDataConfigured()) {
    try {
      await queueDeleteComment(sprint.value.id, goalId, commentId, isSideGoal)
    } catch (err) {
      console.error('Failed to delete comment from Repository:', err)
    }
  }
}

const handleSyncComplete = async () => {
  // Reload sprint data and sidebar after sync
  await Promise.all([
    loadSprintData(route.params.sprintId),
    refreshSidebar()
  ])
}

const handleNextSprintPlansUpdate = (newContent) => {
  // Update local sprint data
  if (sprint.value) {
    sprint.value.nextSprintPlans = newContent
  }
}

const handleAchievementsUpdate = (newContent) => {
  // Update local sprint data
  if (sprint.value) {
    sprint.value.achievements = newContent
  }
}

const handleSprintDataRefresh = async () => {
  // Silently reload sprint data from repository after media references were updated
  // Don't set loading state to avoid UI flicker
  const id = route.params.sprintId || sprint.value?.id
  if (!id) return

  try {
    const freshData = await loadSprint(id)
    // Update sprint data reactively
    sprint.value = freshData
    // Increment key to force re-render of components that display markdown
    refreshKey.value++
  } catch (err) {
    console.error('Failed to refresh sprint data:', err)
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
    <div v-else-if="error" class="flex items-center justify-center min-h-screen p-6">
      <div class="bg-white rounded-xl shadow-lg max-w-lg w-full p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-4 text-amber-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Brak danych sprintu</h2>
          <p class="text-gray-600">{{ error }}</p>
        </div>

        <!-- Info box -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
          <p class="font-medium mb-1">Co możesz zrobić:</p>
          <ol class="list-decimal list-inside space-y-1 text-blue-700">
            <li>Zaloguj się (jeśli jeszcze nie jesteś zalogowany)</li>
            <li>Uruchom synchronizację z Jira, aby pobrać dane</li>
            <li>Poczekaj na zakończenie synchronizacji i odśwież stronę</li>
          </ol>
        </div>

        <!-- Action buttons -->
        <div class="space-y-3">
          <!-- Status repozytorium -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p class="font-medium text-gray-900">1. Status połączenia</p>
              <p class="text-sm text-gray-500">Sprawdź status połączenia z repozytorium danych</p>
            </div>
            <DataRepoStatus v-if="authStore.isAuthenticated" />
          </div>

          <!-- Jira sync -->
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p class="font-medium text-gray-900">2. Synchronizacja Jira</p>
              <p class="text-sm text-gray-500">Pobierz dane z Jira do repozytorium</p>
            </div>
            <JiraSyncButton
              v-if="authStore.isAuthenticated"
              @sync-complete="handleSyncComplete"
            />
          </div>

          <!-- Retry button -->
          <button
            @click="loadSprintData(route.params.sprintId)"
            class="w-full mt-4 px-4 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Odśwież dane
          </button>
        </div>
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
          <!-- Data repo status (only for authenticated users) -->
          <DataRepoStatus v-if="authStore.isAuthenticated" />

          <!-- Jira sync button (only for authenticated users and active sprints) -->
          <JiraSyncButton
            v-if="authStore.isAuthenticated && sprint.status === 'active'"
            @sync-complete="handleSyncComplete"
          />

          <!-- Info for closed sprints -->
          <span
            v-if="authStore.isAuthenticated && sprint.status === 'closed'"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg"
            title="Zamknięty sprint jest zarchiwizowany - dane zadań i celów nie są aktualizowane z Jira"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m10-6V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h4" />
            </svg>
            Zarchiwizowany
          </span>

          <!-- Close sprint button (only for authenticated users and active sprints) -->
          <CloseSprintButton
            v-if="authStore.isAuthenticated && sprint.status === 'active'"
            :sprint-id="sprint.id"
            :sprint-name="sprint.name"
            :sprint-status="sprint.status"
          />

        </div>
      </header>

      <!-- Tabs -->
      <nav class="mb-6 border-b border-gray-200 overflow-x-auto scrollbar-thin">
        <div class="flex gap-3 sm:gap-6 min-w-max">
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
            Wszystkie Zadania
          </button>
          <button
            @click="activeTab = 'stats'"
            class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'stats' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Statystyki Klientów
          </button>
          <button
            @click="activeTab = 'next'"
            class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'next' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Następny Sprint
          </button>
          <button
            @click="activeTab = 'media'"
            class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'media' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Media
          </button>
          <button
            @click="activeTab = 'presentation'"
            class="pb-3 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === 'presentation' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            Prezentacja
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
              @select-goal="handleSelectGoal"
            />

            <SideGoalsList
              v-if="sprint.sideGoals && sprint.sideGoals.length > 0"
              :key="'sidegoals-' + refreshKey"
              :side-goals="sprint.sideGoals"
              :sprint="sprint"
              @select-goal="handleSelectGoal"
            />

            <AchievementsList
              :key="'achievements-' + refreshKey"
              :content="sprint.achievements"
              :sprint-id="sprint.id"
              @update="handleAchievementsUpdate"
            />
          </div>

          <div class="space-y-6">
            <GoalDetail
              v-if="selectedGoal"
              :key="'goaldetail-' + refreshKey"
              :goal="selectedGoal"
              :sprint="sprint"
              @close="handleCloseGoal"
              @add-comment="handleAddComment"
              @update-comment="handleUpdateComment"
              @delete-comment="handleDeleteComment"
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
            <AllTasks :tasks="sprint.tasks" :jira-base-url="sprint.jiraBaseUrl" />
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
              :key="'nextplans-' + refreshKey"
              :content="sprint.nextSprintPlans"
              :jira-timeline-url="sprint.jiraTimelineUrl"
              :sprint-id="sprint.id"
              @update="handleNextSprintPlansUpdate"
            />
          </div>
        </template>

        <!-- Media tab -->
        <template v-if="activeTab === 'media'">
          <div class="lg:col-span-3">
            <MediaManager
              :sprint-id="sprint.id"
              :is-sprint-active="sprint.status === 'active'"
              @sprint-updated="handleSprintDataRefresh"
            />
          </div>
        </template>

        <!-- Presentation tab -->
        <template v-if="activeTab === 'presentation'">
          <div class="lg:col-span-3">
            <PresentationSetup :sprint="sprint" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
