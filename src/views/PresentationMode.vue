<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { loadSprint, loadCurrentSprintInfo, calculateSprintStats, getTasksForGoal, getTasksForSideGoal } from '../services/dataLoader'

const route = useRoute()
const router = useRouter()

const sprint = ref(null)
const loading = ref(true)
const currentSlide = ref(0)
const isFullscreen = ref(false)

// Read selected elements from query params
const selectedElements = computed(() => {
  const elementsParam = route.query.elements
  if (!elementsParam) return ['summary'] // default to summary
  return elementsParam.split(',')
})

// Check if sprint is completed (all main goals are completed)
const isSprintCompleted = computed(() => {
  if (!sprint.value || !sprint.value.goals.length) return false
  return sprint.value.goals.every(goal => goal.completed)
})

// Calculate stats for main goals only
const stats = computed(() => {
  if (!sprint.value) return null
  const baseStats = calculateSprintStats(sprint.value)

  // Calculate tasks count for main goals only (goals use 'tasks' array with task keys)
  const mainGoalTaskKeys = new Set()
  sprint.value.goals.forEach(goal => {
    if (goal.tasks && Array.isArray(goal.tasks)) {
      goal.tasks.forEach(key => mainGoalTaskKeys.add(key))
    }
  })

  const mainGoalTasks = sprint.value.tasks.filter(task => mainGoalTaskKeys.has(task.key))
  const completedMainGoalTasks = mainGoalTasks.filter(task => task.status === 'Done').length

  return {
    ...baseStats,
    completedMainGoalTasks,
    totalMainGoalTasks: mainGoalTasks.length
  }
})

// Tasks modal state
const showTasksModal = ref(false)
const tasksModalFilter = ref('all')
const tasksModalSort = ref('status')

const statusOrder = {
  'Done': 1,
  'In Progress': 2,
  'To Do': 3
}

// All tasks statistics
const allTasksStats = computed(() => {
  if (!sprint.value) return { done: 0, inProgress: 0, todo: 0, total: 0 }
  const tasks = sprint.value.tasks
  return {
    done: tasks.filter(t => t.status === 'Done').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    todo: tasks.filter(t => t.status === 'To Do').length,
    total: tasks.length
  }
})

// Filtered and sorted tasks for modal
const modalTasks = computed(() => {
  if (!sprint.value) return []
  let filtered = [...sprint.value.tasks]

  // Filter by status
  if (tasksModalFilter.value !== 'all') {
    filtered = filtered.filter(t => t.status === tasksModalFilter.value)
  }

  // Sort
  return filtered.sort((a, b) => {
    if (tasksModalSort.value === 'status') {
      const statusCompare = statusOrder[a.status] - statusOrder[b.status]
      if (statusCompare !== 0) return statusCompare
      const hasAssigneeA = !!a.assignee
      const hasAssigneeB = !!b.assignee
      if (hasAssigneeA && !hasAssigneeB) return -1
      if (!hasAssigneeA && hasAssigneeB) return 1
      if (hasAssigneeA && hasAssigneeB) return a.assignee.localeCompare(b.assignee)
      return 0
    }
    if (tasksModalSort.value === 'epic') {
      const epicA = a.epic || 'zzz'
      const epicB = b.epic || 'zzz'
      const epicCompare = epicA.localeCompare(epicB)
      if (epicCompare !== 0) return epicCompare
      return statusOrder[a.status] - statusOrder[b.status]
    }
    if (tasksModalSort.value === 'assignee') {
      const hasAssigneeA = !!a.assignee
      const hasAssigneeB = !!b.assignee
      if (hasAssigneeA && !hasAssigneeB) return -1
      if (!hasAssigneeA && hasAssigneeB) return 1
      if (hasAssigneeA && hasAssigneeB) {
        const assigneeCompare = a.assignee.localeCompare(b.assignee)
        if (assigneeCompare !== 0) return assigneeCompare
      }
      return statusOrder[a.status] - statusOrder[b.status]
    }
    return 0
  })
})

const openTasksModal = (filter = 'all') => {
  tasksModalFilter.value = filter
  showTasksModal.value = true
}

const closeTasksModal = () => {
  showTasksModal.value = false
}

// Generate slides based on selected elements
const slides = computed(() => {
  if (!sprint.value) return []
  const slideList = []

  // Summary slide
  if (selectedElements.value.includes('summary')) {
    slideList.push({ type: 'summary', title: 'Podsumowanie' })
  }

  // Goals slides - jeden slajd per cel główny
  if (selectedElements.value.includes('goals')) {
    sprint.value.goals.forEach((goal, index) => {
      slideList.push({
        type: 'goal',
        title: `Cel ${index + 1}: ${goal.title}`,
        data: goal,
        index: index
      })
    })
  }

  // Side goals slide - jeden zbiorczy slajd
  if (selectedElements.value.includes('sideGoals')) {
    const sideGoals = sprint.value.sideGoals || []
    if (sideGoals.length > 0) {
      slideList.push({
        type: 'sideGoals',
        title: 'Cele poboczne',
        data: sideGoals
      })
    }
  }

  // Achievements slide
  if (selectedElements.value.includes('achievements')) {
    if (sprint.value.achievements && sprint.value.achievements.trim()) {
      slideList.push({
        type: 'achievements',
        title: 'Osiągnięcia dodatkowe',
        data: sprint.value.achievements
      })
    }
  }

  // Tasks slide
  if (selectedElements.value.includes('tasks')) {
    slideList.push({
      type: 'tasks',
      title: 'Zadania',
      data: sprint.value.tasks
    })
  }

  // Next plans slide
  if (selectedElements.value.includes('nextPlans')) {
    if (sprint.value.nextSprintPlans && sprint.value.nextSprintPlans.trim()) {
      slideList.push({
        type: 'nextPlans',
        title: 'Plany na następny sprint',
        data: sprint.value.nextSprintPlans
      })
    }
  }

  // End slide - zawsze na końcu
  slideList.push({ type: 'end', title: 'Koniec prezentacji' })

  return slideList
})

const currentSlideData = computed(() => slides.value[currentSlide.value])

const nextSlide = () => {
  if (currentSlide.value < slides.value.length - 1) {
    currentSlide.value++
  }
}

const prevSlide = () => {
  if (currentSlide.value > 0) {
    currentSlide.value--
  }
}

const goToSlide = (index) => {
  currentSlide.value = index
}

const exitPresentation = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  }
  if (sprint.value?.id) {
    router.push({ name: 'sprint', params: { sprintId: sprint.value.id } })
  } else {
    router.push({ name: 'sprint' })
  }
}

const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    await document.exitFullscreen()
    isFullscreen.value = false
  }
}

const handleKeydown = (e) => {
  // Handle modal first
  if (showTasksModal.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeTasksModal()
    }
    return // Don't handle other keys when modal is open
  }

  switch (e.key) {
    case 'ArrowRight':
    case 'Space':
    case 'Enter':
      e.preventDefault()
      nextSlide()
      break
    case 'ArrowLeft':
    case 'Backspace':
      e.preventDefault()
      prevSlide()
      break
    case 'Escape':
      exitPresentation()
      break
    case 'f':
    case 'F':
      toggleFullscreen()
      break
    case 'Home':
      currentSlide.value = 0
      break
    case 'End':
      currentSlide.value = slides.value.length - 1
      break
  }
}

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(async () => {
  try {
    let sprintId = route.params.sprintId
    if (!sprintId) {
      const currentInfo = await loadCurrentSprintInfo()
      sprintId = currentInfo.currentSprintId
    }
    sprint.value = await loadSprint(sprintId)
  } catch (error) {
    console.error('Failed to load sprint:', error)
  } finally {
    loading.value = false
  }

  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)

  // Auto-enter fullscreen
  if (document.documentElement.requestFullscreen) {
    try {
      await document.documentElement.requestFullscreen()
      isFullscreen.value = true
    } catch {
      // Fullscreen may be blocked
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const renderMarkdown = (text) => {
  if (!text) return ''
  return DOMPurify.sanitize(marked(text))
}

// Calculate task stats for a goal
const getGoalTaskStats = (goal, isSideGoal = false) => {
  if (!sprint.value) return { done: 0, inProgress: 0, todo: 0, total: 0 }
  const tasks = isSideGoal
    ? getTasksForSideGoal(sprint.value, goal)
    : getTasksForGoal(sprint.value, goal)
  return {
    done: tasks.filter(t => t.status === 'Done').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    todo: tasks.filter(t => t.status === 'To Do').length,
    total: tasks.length
  }
}

// Determine goal status for coloring
const getGoalStatus = (goal) => {
  if (goal.completed) return 'completed'
  if (sprint.value?.status === 'closed') return 'failed'
  // Check if there are any in-progress tasks
  const stats = getGoalTaskStats(goal, false)
  if (stats.inProgress > 0 || stats.done > 0) return 'inProgress'
  return 'todo'
}

const getSideGoalStatus = (sideGoal) => {
  if (sideGoal.completed) return 'completed'
  if (sprint.value?.status === 'closed') return 'failed'
  const stats = getGoalTaskStats(sideGoal, true)
  if (stats.inProgress > 0 || stats.done > 0) return 'inProgress'
  return 'todo'
}

// Status colors and labels
const statusConfig = {
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', solid: 'bg-green-500', label: 'Ukończony' },
  inProgress: { bg: 'bg-blue-500/20', text: 'text-blue-400', solid: 'bg-blue-500', label: 'W trakcie' },
  todo: { bg: 'bg-gray-500/20', text: 'text-gray-400', solid: 'bg-gray-500', label: 'Do zrobienia' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', solid: 'bg-red-500', label: 'Nie udało się' }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>

    <!-- No data state -->
    <div v-else-if="!sprint" class="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <svg class="w-20 h-20 text-white/30 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 class="text-3xl font-bold mb-4">Brak danych do prezentacji</h2>
      <p class="text-xl text-white/60 mb-8 max-w-md">
        Nie znaleziono danych sprintu. Upewnij się, że jesteś zalogowany i masz zsynchronizowane dane z Jira.
      </p>
      <button
        @click="exitPresentation"
        class="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-lg font-medium transition-colors"
      >
        Wróć do aplikacji
      </button>
    </div>

    <!-- Presentation -->
    <div v-else class="relative min-h-screen flex flex-col">
      <!-- Top bar -->
      <div class="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/30 to-transparent">
        <div class="text-sm text-white/70">
          {{ sprint.name }} · Slide {{ currentSlide + 1 }}/{{ slides.length }}
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="toggleFullscreen"
            class="p-2 text-white/70 hover:text-white transition-colors"
            :title="isFullscreen ? 'Wyjdź z trybu pełnoekranowego (F)' : 'Pełny ekran (F)'"
          >
            <svg v-if="!isFullscreen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
          <button
            @click="exitPresentation"
            class="p-2 text-white/70 hover:text-white transition-colors"
            title="Zamknij prezentację (Esc)"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Slide content -->
      <div class="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <transition name="slide" mode="out-in">
          <!-- Summary slide -->
          <div v-if="currentSlideData?.type === 'summary'" :key="'summary'" class="text-center max-w-4xl">
            <h1 class="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4">{{ sprint.name }}</h1>
            <p class="text-lg sm:text-xl lg:text-2xl text-white/70 mb-2">Sprint Review</p>
            <p class="text-base sm:text-lg lg:text-xl text-white/60 mb-8">
              {{ formatDate(sprint.startDate) }} - {{ formatDate(sprint.endDate) }}
            </p>

            <!-- Sprint completion status -->
            <div class="mb-8">
              <span
                class="px-6 py-3 rounded-full text-xl sm:text-2xl font-semibold"
                :class="isSprintCompleted ? 'bg-green-500/20 text-green-400' : (sprint.status === 'closed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400')"
              >
                Sprint {{ isSprintCompleted ? 'zrealizowany' : (sprint.status === 'closed' ? 'nie zrealizowany' : 'w trakcie') }}
              </span>
            </div>

            <!-- Statistics -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 max-w-2xl mx-auto mb-8 sm:mb-12">
              <div class="bg-white/10 rounded-xl p-4 sm:p-6">
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold">{{ stats.completedGoals }}/{{ stats.totalGoals }}</div>
                <div class="text-white/60 mt-2 text-sm sm:text-base">Cele główne</div>
              </div>
              <div class="bg-white/10 rounded-xl p-4 sm:p-6">
                <div class="text-2xl sm:text-3xl lg:text-4xl font-bold">{{ stats.completedMainGoalTasks }}/{{ stats.totalMainGoalTasks }}</div>
                <div class="text-white/60 mt-2 text-sm sm:text-base">Zadania celów głównych</div>
              </div>
            </div>

            <!-- Main goals list -->
            <div class="text-left max-w-2xl mx-auto">
              <h3 class="text-xl font-semibold mb-4 text-white/70">Cele główne:</h3>
              <div class="space-y-2">
                <div
                  v-for="goal in sprint.goals"
                  :key="goal.id"
                  class="flex items-center gap-3 p-3 rounded-lg"
                  :class="statusConfig[getGoalStatus(goal)].bg"
                >
                  <span
                    class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                    :class="statusConfig[getGoalStatus(goal)].solid"
                  >
                    <svg v-if="goal.completed" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else-if="getGoalStatus(goal) === 'failed'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </span>
                  <span class="flex-1">{{ goal.title }}</span>
                  <span class="ml-auto" :class="statusConfig[getGoalStatus(goal)].text">{{ goal.completionPercent }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Goal slide - pojedynczy cel główny -->
          <div v-else-if="currentSlideData?.type === 'goal'" :key="'goal-' + currentSlideData.index" class="max-w-4xl w-full">
            <div class="text-center mb-6 sm:mb-8">
              <span class="text-white/50 text-sm sm:text-lg">Cel główny {{ currentSlideData.index + 1 }}</span>
              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold mt-2">{{ currentSlideData.data.title }}</h2>
            </div>

            <!-- Goal status and progress -->
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-6 sm:mb-8">
              <div class="text-center">
                <span
                  class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm sm:text-lg font-medium"
                  :class="statusConfig[getGoalStatus(currentSlideData.data)].bg + ' ' + statusConfig[getGoalStatus(currentSlideData.data)].text"
                >
                  {{ statusConfig[getGoalStatus(currentSlideData.data)].label }}
                </span>
              </div>
              <div class="text-center">
                <div class="text-3xl sm:text-4xl lg:text-5xl font-bold">{{ currentSlideData.data.completionPercent }}%</div>
                <div class="text-white/50 mt-1 text-sm sm:text-base">postęp</div>
              </div>
            </div>

            <!-- Multi-segment Progress bar -->
            <div class="w-full bg-white/10 rounded-full h-4 mb-4 overflow-hidden flex">
              <div
                v-if="getGoalTaskStats(currentSlideData.data, false).done > 0"
                class="h-full bg-green-500 transition-all duration-500"
                :style="{ width: (getGoalTaskStats(currentSlideData.data, false).done / getGoalTaskStats(currentSlideData.data, false).total * 100) + '%' }"
              ></div>
              <div
                v-if="getGoalTaskStats(currentSlideData.data, false).inProgress > 0"
                class="h-full bg-blue-500 transition-all duration-500"
                :style="{ width: (getGoalTaskStats(currentSlideData.data, false).inProgress / getGoalTaskStats(currentSlideData.data, false).total * 100) + '%' }"
              ></div>
              <div
                v-if="getGoalTaskStats(currentSlideData.data, false).todo > 0"
                class="h-full bg-gray-500 transition-all duration-500"
                :style="{ width: (getGoalTaskStats(currentSlideData.data, false).todo / getGoalTaskStats(currentSlideData.data, false).total * 100) + '%' }"
              ></div>
            </div>

            <!-- Task stats legend -->
            <div class="flex justify-center gap-6 mb-8 text-sm">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-green-500"></span>
                <span class="text-white/70">Done: {{ getGoalTaskStats(currentSlideData.data, false).done }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                <span class="text-white/70">In Progress: {{ getGoalTaskStats(currentSlideData.data, false).inProgress }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-gray-500"></span>
                <span class="text-white/70">To Do: {{ getGoalTaskStats(currentSlideData.data, false).todo }}</span>
              </div>
            </div>

            <!-- Client info -->
            <div v-if="currentSlideData.data.client" class="text-center mb-8">
              <span class="text-white/50">Klient:</span>
              <span class="ml-2 text-lg">{{ currentSlideData.data.client }}</span>
            </div>

            <!-- Comments -->
            <div v-if="currentSlideData.data.comments && currentSlideData.data.comments.length > 0" class="mt-8">
              <h3 class="text-xl font-semibold mb-4 text-white/70">Komentarze:</h3>
              <div class="space-y-4">
                <div
                  v-for="(comment, idx) in currentSlideData.data.comments"
                  :key="idx"
                  class="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div class="prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(comment.text)"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Side goals slide - zbiorczy -->
          <div v-else-if="currentSlideData?.type === 'sideGoals'" :key="'sideGoals'" class="max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-6 sm:mb-8">Cele poboczne</h2>

            <!-- Side goals list -->
            <div class="space-y-4">
              <div
                v-for="(sideGoal, index) in currentSlideData.data"
                :key="sideGoal.id"
                class="rounded-lg p-4"
                :class="statusConfig[getSideGoalStatus(sideGoal)].bg"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <span
                      class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                      :class="statusConfig[getSideGoalStatus(sideGoal)].solid"
                    >
                      <svg v-if="sideGoal.completed" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <svg v-else-if="getSideGoalStatus(sideGoal) === 'failed'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                      <span v-else class="text-sm font-medium">{{ index + 1 }}</span>
                    </span>
                    <div>
                      <span class="text-lg font-medium">{{ sideGoal.title }}</span>
                      <span v-if="sideGoal.client" class="text-white/50 text-sm ml-2">· {{ sideGoal.client }}</span>
                    </div>
                  </div>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="statusConfig[getSideGoalStatus(sideGoal)].bg + ' ' + statusConfig[getSideGoalStatus(sideGoal)].text"
                  >
                    {{ statusConfig[getSideGoalStatus(sideGoal)].label }}
                  </span>
                </div>

                <!-- Progress bar for side goal -->
                <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden flex mb-2">
                  <div
                    v-if="getGoalTaskStats(sideGoal, true).done > 0"
                    class="h-full bg-green-500"
                    :style="{ width: (getGoalTaskStats(sideGoal, true).total > 0 ? getGoalTaskStats(sideGoal, true).done / getGoalTaskStats(sideGoal, true).total * 100 : 0) + '%' }"
                  ></div>
                  <div
                    v-if="getGoalTaskStats(sideGoal, true).inProgress > 0"
                    class="h-full bg-blue-500"
                    :style="{ width: (getGoalTaskStats(sideGoal, true).total > 0 ? getGoalTaskStats(sideGoal, true).inProgress / getGoalTaskStats(sideGoal, true).total * 100 : 0) + '%' }"
                  ></div>
                  <div
                    v-if="getGoalTaskStats(sideGoal, true).todo > 0"
                    class="h-full bg-gray-500"
                    :style="{ width: (getGoalTaskStats(sideGoal, true).total > 0 ? getGoalTaskStats(sideGoal, true).todo / getGoalTaskStats(sideGoal, true).total * 100 : 0) + '%' }"
                  ></div>
                </div>
                <div class="flex gap-4 text-xs text-white/50">
                  <span><span class="text-green-400">{{ getGoalTaskStats(sideGoal, true).done }}</span> Done</span>
                  <span><span class="text-blue-400">{{ getGoalTaskStats(sideGoal, true).inProgress }}</span> In Progress</span>
                  <span><span class="text-gray-400">{{ getGoalTaskStats(sideGoal, true).todo }}</span> To Do</span>
                </div>

                <!-- Comments for side goal -->
                <div v-if="sideGoal.comments && sideGoal.comments.length > 0" class="mt-3 space-y-2">
                  <div
                    v-for="(comment, idx) in sideGoal.comments"
                    :key="idx"
                    class="bg-white/5 border border-white/10 rounded-lg p-3 ml-11"
                  >
                    <div class="prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(comment.text)"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Achievements slide -->
          <div v-else-if="currentSlideData?.type === 'achievements'" :key="'achievements'" class="max-w-4xl w-full">
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-6 sm:mb-8">Osiągnięcia dodatkowe</h2>
            <div class="bg-white/5 rounded-xl p-8">
              <div class="prose prose-invert prose-lg max-w-none" v-html="renderMarkdown(currentSlideData.data)"></div>
            </div>
          </div>

          <!-- Tasks slide -->
          <div v-else-if="currentSlideData?.type === 'tasks'" :key="'tasks'" class="max-w-4xl w-full">
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-4">Zadania</h2>
            <p class="text-center text-white/50 text-sm sm:text-base mb-8 sm:mb-12">Wszystkie zadania sprintu (cele główne, poboczne i pozostałe)</p>

            <!-- Total tasks count -->
            <div class="text-center mb-8 sm:mb-12">
              <button
                @click="openTasksModal('all')"
                class="text-5xl sm:text-6xl lg:text-7xl font-bold hover:text-white/80 transition-colors cursor-pointer"
              >
                {{ allTasksStats.total }}
              </button>
              <div class="text-white/50 text-base sm:text-lg lg:text-xl mt-2">zadań łącznie</div>
            </div>

            <!-- Task stats - clickable -->
            <div class="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
              <button
                @click="openTasksModal('Done')"
                class="bg-green-500/20 hover:bg-green-500/30 rounded-2xl py-4 sm:py-8 text-center transition-all cursor-pointer group w-full sm:w-40 lg:w-48"
              >
                <div class="text-4xl sm:text-5xl lg:text-6xl font-bold text-green-400 group-hover:scale-110 transition-transform">{{ allTasksStats.done }}</div>
                <div class="text-white/60 text-base sm:text-lg mt-2">Done</div>
              </button>
              <button
                @click="openTasksModal('In Progress')"
                class="bg-blue-500/20 hover:bg-blue-500/30 rounded-2xl py-4 sm:py-8 text-center transition-all cursor-pointer group w-full sm:w-40 lg:w-48"
              >
                <div class="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-400 group-hover:scale-110 transition-transform">{{ allTasksStats.inProgress }}</div>
                <div class="text-white/60 text-base sm:text-lg mt-2">In Progress</div>
              </button>
              <button
                @click="openTasksModal('To Do')"
                class="bg-gray-500/20 hover:bg-gray-500/30 rounded-2xl py-4 sm:py-8 text-center transition-all cursor-pointer group w-full sm:w-40 lg:w-48"
              >
                <div class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-400 group-hover:scale-110 transition-transform">{{ allTasksStats.todo }}</div>
                <div class="text-white/60 text-base sm:text-lg mt-2">To Do</div>
              </button>
            </div>

            <p class="text-center text-white/40 text-sm mt-8">Kliknij na liczbę, aby zobaczyć szczegóły zadań</p>
          </div>

          <!-- Next plans slide -->
          <div v-else-if="currentSlideData?.type === 'nextPlans'" :key="'nextPlans'" class="max-w-4xl w-full">
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-6 sm:mb-8">Plany na następny sprint</h2>
            <div class="bg-white/5 rounded-xl p-8">
              <div class="prose prose-invert prose-lg max-w-none" v-html="renderMarkdown(currentSlideData.data)"></div>
            </div>
          </div>

          <!-- End slide -->
          <div v-else-if="currentSlideData?.type === 'end'" :key="'end'" class="text-center">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8">Dziękujemy!</h2>
            <p class="text-lg sm:text-xl lg:text-2xl text-white/60 mb-8 sm:mb-12">{{ sprint.name }} Review</p>

            <button
              @click="exitPresentation"
              class="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-lg font-medium transition-colors"
            >
              Wróć do widoku szczegółowego
            </button>
          </div>
        </transition>
      </div>

      <!-- Navigation -->
      <div class="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/30 to-transparent">
        <!-- Slide indicators -->
        <div class="flex items-center gap-1">
          <button
            v-for="(slide, index) in slides"
            :key="index"
            @click="goToSlide(index)"
            class="w-2 h-2 rounded-full transition-all"
            :class="index === currentSlide ? 'bg-white w-8' : 'bg-white/30 hover:bg-white/50'"
          ></button>
        </div>

        <!-- Arrow navigation -->
        <div class="flex items-center gap-4">
          <button
            @click="prevSlide"
            :disabled="currentSlide === 0"
            class="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            @click="nextSlide"
            :disabled="currentSlide === slides.length - 1"
            class="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Keyboard hints -->
        <div class="text-sm text-white/40">
          ← → nawigacja · F pełny ekran · Esc wyjście
        </div>
      </div>
    </div>

    <!-- Tasks Modal -->
    <Teleport to="body">
      <transition name="modal">
        <div
          v-if="showTasksModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeTasksModal"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

          <!-- Modal content -->
          <div class="relative bg-gray-900 rounded-2xl shadow-2xl border border-white/10 w-full max-w-[95vw] sm:max-w-4xl max-h-[85vh] flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 class="text-xl font-semibold text-white">
                Zadania
                <span v-if="tasksModalFilter !== 'all'" class="text-white/60">
                  - {{ tasksModalFilter }}
                </span>
                <span class="text-white/40 font-normal ml-2">({{ modalTasks.length }})</span>
              </h3>
              <button
                @click="closeTasksModal"
                class="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Filters and sorting -->
            <div class="px-6 py-3 border-b border-white/10 flex flex-wrap items-center gap-4">
              <!-- Status filter -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-white/50">Filtruj:</span>
                <div class="flex gap-1">
                  <button
                    @click="tasksModalFilter = 'all'"
                    class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                    :class="tasksModalFilter === 'all' ? 'bg-white text-gray-900' : 'bg-white/10 text-white/70 hover:bg-white/20'"
                  >
                    Wszystkie
                  </button>
                  <button
                    @click="tasksModalFilter = 'Done'"
                    class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                    :class="tasksModalFilter === 'Done' ? 'bg-green-500 text-white' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'"
                  >
                    Done ({{ allTasksStats.done }})
                  </button>
                  <button
                    @click="tasksModalFilter = 'In Progress'"
                    class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                    :class="tasksModalFilter === 'In Progress' ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'"
                  >
                    In Progress ({{ allTasksStats.inProgress }})
                  </button>
                  <button
                    @click="tasksModalFilter = 'To Do'"
                    class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                    :class="tasksModalFilter === 'To Do' ? 'bg-gray-500 text-white' : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'"
                  >
                    To Do ({{ allTasksStats.todo }})
                  </button>
                </div>
              </div>

              <!-- Sort -->
              <div class="flex items-center gap-2 ml-auto">
                <span class="text-sm text-white/50">Sortuj:</span>
                <select
                  v-model="tasksModalSort"
                  class="px-3 py-1.5 text-sm bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-white/30 focus:border-white/30 outline-none"
                >
                  <option value="status">Status</option>
                  <option value="epic">Epic</option>
                  <option value="assignee">Osoba</option>
                </select>
              </div>
            </div>

            <!-- Task list -->
            <div class="flex-1 overflow-y-auto">
              <ul class="divide-y divide-white/5">
                <li
                  v-for="task in modalTasks"
                  :key="task.key"
                >
                  <a
                    :href="sprint.jiraBaseUrl ? sprint.jiraBaseUrl + '/browse/' + task.key : undefined"
                    :target="sprint.jiraBaseUrl ? '_blank' : undefined"
                    :rel="sprint.jiraBaseUrl ? 'noopener noreferrer' : undefined"
                    class="px-6 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors"
                  >
                    <span
                      class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      :class="task.status === 'Done' ? 'bg-green-500 text-white' : task.status === 'In Progress' ? 'bg-blue-500 text-white' : 'border-2 border-white/30'"
                    >
                      <svg v-if="task.status === 'Done'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <span v-else-if="task.status === 'In Progress'" class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-mono text-white/40">{{ task.key }}</span>
                        <span v-if="task.epic" class="text-xs text-white/30">{{ task.epic }}</span>
                      </div>
                      <p class="text-sm text-white/90">{{ task.summary }}</p>
                    </div>
                    <span v-if="task.assignee" class="text-xs text-white/50">{{ task.assignee }}</span>
                    <span
                      class="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full"
                      :class="{
                        'bg-green-500/20 text-green-400': task.status === 'Done',
                        'bg-blue-500/20 text-blue-400': task.status === 'In Progress',
                        'bg-gray-500/20 text-gray-400': task.status === 'To Do'
                      }"
                    >
                      {{ task.status }}
                    </span>
                  </a>
                </li>
              </ul>

              <!-- Empty state -->
              <div v-if="modalTasks.length === 0" class="p-8 text-center text-white/50">
                Brak zadań do wyświetlenia
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Modal animations */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
