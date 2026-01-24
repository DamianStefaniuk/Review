<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadSprint, loadCurrentSprintInfo, calculateSprintStats } from '../services/dataLoader'

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

  // Calculate tasks count for main goals only
  const mainGoalTaskKeys = new Set()
  sprint.value.goals.forEach(goal => {
    if (goal.taskKeys) {
      goal.taskKeys.forEach(key => mainGoalTaskKeys.add(key))
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

// Generate slides based on selected elements
const slides = computed(() => {
  if (!sprint.value) return []
  const slideList = []

  // Add slides based on selected elements
  if (selectedElements.value.includes('summary')) {
    slideList.push({ type: 'summary', title: 'Podsumowanie' })
  }

  // Always add end slide
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
      <div class="flex-1 flex items-center justify-center p-12">
        <transition name="slide" mode="out-in">
          <!-- Summary slide -->
          <div v-if="currentSlideData?.type === 'summary'" :key="'summary'" class="text-center max-w-4xl">
            <h1 class="text-6xl font-bold mb-4">{{ sprint.name }}</h1>
            <p class="text-2xl text-white/70 mb-2">Sprint Review</p>
            <p class="text-xl text-white/60 mb-8">
              {{ formatDate(sprint.startDate) }} - {{ formatDate(sprint.endDate) }}
            </p>

            <!-- Sprint completion status -->
            <div class="mb-8">
              <span
                class="px-6 py-3 rounded-full text-2xl font-semibold"
                :class="isSprintCompleted ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'"
              >
                Sprint {{ isSprintCompleted ? 'zrealizowany' : 'nie zrealizowany' }}
              </span>
            </div>

            <!-- Statistics -->
            <div class="grid grid-cols-2 gap-8 max-w-2xl mx-auto mb-12">
              <div class="bg-white/10 rounded-xl p-6">
                <div class="text-4xl font-bold">{{ stats.completedGoals }}/{{ stats.totalGoals }}</div>
                <div class="text-white/60 mt-2">Cele główne</div>
              </div>
              <div class="bg-white/10 rounded-xl p-6">
                <div class="text-4xl font-bold">{{ stats.completedMainGoalTasks }}/{{ stats.totalMainGoalTasks }}</div>
                <div class="text-white/60 mt-2">Zadania celów głównych</div>
              </div>
            </div>

            <!-- Main goals list -->
            <div class="text-left max-w-2xl mx-auto">
              <h3 class="text-xl font-semibold mb-4 text-white/70">Cele główne:</h3>
              <div class="space-y-2">
                <div
                  v-for="goal in sprint.goals"
                  :key="goal.id"
                  class="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                >
                  <span
                    class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    :class="goal.completed ? 'bg-green-500' : 'bg-gray-500'"
                  >
                    <svg v-if="goal.completed" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </span>
                  <span class="flex-1">{{ goal.title }}</span>
                  <span class="ml-auto text-white/50">{{ goal.completionPercent }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- End slide -->
          <div v-else-if="currentSlideData?.type === 'end'" :key="'end'" class="text-center">
            <h2 class="text-5xl font-bold mb-8">Dziękujemy!</h2>
            <p class="text-2xl text-white/60 mb-12">{{ sprint.name }} Review</p>

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
</style>
