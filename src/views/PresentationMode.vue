<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadSprint, loadCurrentSprintInfo, calculateSprintStats, getTasksForGoal } from '../services/dataLoader'
import ProgressBar from '../components/ProgressBar.vue'
import { pluralize, pluralizeWithCount, POLISH_NOUNS } from '../utils/pluralize'

const route = useRoute()
const router = useRouter()

const sprint = ref(null)
const loading = ref(true)
const currentSlide = ref(0)
const isFullscreen = ref(false)

// Slides: overview, goals (one per goal), achievements, tasks, next sprint
const slides = computed(() => {
  if (!sprint.value) return []

  const slideList = [
    { type: 'overview', title: sprint.value.name }
  ]

  sprint.value.goals.forEach((goal, index) => {
    slideList.push({ type: 'goal', goal, index: index + 1 })
  })

  if (sprint.value.achievements.length > 0) {
    slideList.push({ type: 'achievements', title: 'Osiągnięcia dodatkowe' })
  }

  slideList.push({ type: 'tasks', title: 'Wszystkie zadania' })

  if (sprint.value.nextSprintPlans) {
    slideList.push({ type: 'next', title: 'Następny sprint' })
  }

  slideList.push({ type: 'end', title: 'Koniec prezentacji' })

  return slideList
})

const currentSlideData = computed(() => slides.value[currentSlide.value])
const stats = computed(() => sprint.value ? calculateSprintStats(sprint.value) : null)

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

const getGoalTasks = (goal) => {
  return getTasksForGoal(sprint.value, goal)
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
          <!-- Overview slide -->
          <div v-if="currentSlideData?.type === 'overview'" :key="'overview'" class="text-center max-w-4xl">
            <h1 class="text-6xl font-bold mb-4">{{ sprint.name }}</h1>
            <p class="text-2xl text-white/70 mb-8">Sprint Review</p>
            <p class="text-xl text-white/60 mb-12">
              {{ formatDate(sprint.startDate) }} - {{ formatDate(sprint.endDate) }}
            </p>

            <div class="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div class="bg-white/10 rounded-xl p-6">
                <div class="text-4xl font-bold">{{ stats.completedGoals }}/{{ stats.totalGoals }}</div>
                <div class="text-white/60 mt-2 capitalize">{{ pluralize(stats.totalGoals, POLISH_NOUNS.goal) }}</div>
              </div>
              <div class="bg-white/10 rounded-xl p-6">
                <div class="text-4xl font-bold">{{ stats.completedTasks }}/{{ stats.totalTasks }}</div>
                <div class="text-white/60 mt-2 capitalize">{{ pluralize(stats.totalTasks, POLISH_NOUNS.task) }}</div>
              </div>
              <div class="bg-white/10 rounded-xl p-6">
                <div class="text-4xl font-bold">{{ stats.avgProgress }}%</div>
                <div class="text-white/60 mt-2">Średni postęp</div>
              </div>
            </div>
          </div>

          <!-- Goal slide -->
          <div v-else-if="currentSlideData?.type === 'goal'" :key="'goal-' + currentSlideData.goal.id" class="max-w-4xl w-full">
            <div class="mb-4 text-white/50 text-lg">Cel {{ currentSlideData.index }} z {{ sprint.goals.length }}</div>

            <h2 class="text-4xl font-bold mb-6">{{ currentSlideData.goal.title }}</h2>

            <div class="flex items-center gap-4 mb-8">
              <span v-if="currentSlideData.goal.client" class="px-4 py-2 bg-white/10 rounded-full text-lg">
                {{ currentSlideData.goal.client }}
              </span>
              <span
                class="px-4 py-2 rounded-full text-lg"
                :class="currentSlideData.goal.completed ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'"
              >
                {{ currentSlideData.goal.completed ? 'Ukończony' : 'W trakcie' }}
              </span>
            </div>

            <div class="mb-8">
              <div class="flex items-center justify-between text-lg mb-2">
                <span>Postęp</span>
                <span>{{ currentSlideData.goal.completionPercent }}%</span>
              </div>
              <div class="h-4 bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-1000"
                  :class="currentSlideData.goal.completed ? 'bg-green-500' : 'bg-blue-500'"
                  :style="{ width: `${currentSlideData.goal.completionPercent}%` }"
                ></div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-8">
              <div>
                <h3 class="text-xl font-semibold mb-4 text-white/70 capitalize">{{ pluralize(getGoalTasks(currentSlideData.goal).length, POLISH_NOUNS.task) }}</h3>
                <div class="space-y-2">
                  <div
                    v-for="task in getGoalTasks(currentSlideData.goal)"
                    :key="task.key"
                    class="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <span
                      class="w-5 h-5 rounded-full flex items-center justify-center"
                      :class="task.status === 'Done' ? 'bg-green-500' : task.status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-500'"
                    >
                      <svg v-if="task.status === 'Done'" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </span>
                    <span class="text-sm">{{ task.summary }}</span>
                  </div>
                </div>
              </div>

              <div v-if="currentSlideData.goal.comments.length > 0">
                <h3 class="text-xl font-semibold mb-4 text-white/70">Komentarze</h3>
                <div class="space-y-3">
                  <div
                    v-for="comment in currentSlideData.goal.comments"
                    :key="comment.id"
                    class="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20"
                  >
                    <div class="font-medium text-yellow-400 mb-1">{{ comment.author }}</div>
                    <div class="text-sm text-white/80">{{ comment.text }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Achievements slide -->
          <div v-else-if="currentSlideData?.type === 'achievements'" :key="'achievements'" class="max-w-4xl w-full">
            <h2 class="text-4xl font-bold mb-8 text-center">Osiągnięcia dodatkowe</h2>

            <div class="grid grid-cols-2 gap-4">
              <div
                v-for="achievement in sprint.achievements"
                :key="achievement.id"
                class="flex items-center gap-4 p-4 bg-white/5 rounded-xl"
              >
                <span
                  class="w-8 h-8 rounded-full flex items-center justify-center"
                  :class="achievement.completed ? 'bg-green-500' : 'bg-gray-500'"
                >
                  <svg v-if="achievement.completed" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </span>
                <div class="flex-1">
                  <div class="font-medium">{{ achievement.title }}</div>
                  <div v-if="achievement.client" class="text-sm text-white/50">{{ achievement.client }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tasks slide -->
          <div v-else-if="currentSlideData?.type === 'tasks'" :key="'tasks'" class="max-w-5xl w-full">
            <h2 class="text-4xl font-bold mb-8 text-center">Wszystkie zadania</h2>

            <div class="grid grid-cols-3 gap-6">
              <div>
                <h3 class="text-lg font-semibold mb-4 text-green-400 flex items-center gap-2">
                  <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                  Done ({{ sprint.tasks.filter(t => t.status === 'Done').length }})
                </h3>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                  <div
                    v-for="task in sprint.tasks.filter(t => t.status === 'Done')"
                    :key="task.key"
                    class="p-2 bg-green-500/10 rounded-lg text-sm"
                  >
                    {{ task.summary }}
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2">
                  <span class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                  In Progress ({{ sprint.tasks.filter(t => t.status === 'In Progress').length }})
                </h3>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                  <div
                    v-for="task in sprint.tasks.filter(t => t.status === 'In Progress')"
                    :key="task.key"
                    class="p-2 bg-blue-500/10 rounded-lg text-sm"
                  >
                    {{ task.summary }}
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-semibold mb-4 text-gray-400 flex items-center gap-2">
                  <span class="w-3 h-3 bg-gray-500 rounded-full"></span>
                  To Do ({{ sprint.tasks.filter(t => t.status === 'To Do').length }})
                </h3>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                  <div
                    v-for="task in sprint.tasks.filter(t => t.status === 'To Do')"
                    :key="task.key"
                    class="p-2 bg-gray-500/10 rounded-lg text-sm"
                  >
                    {{ task.summary }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Next sprint slide -->
          <div v-else-if="currentSlideData?.type === 'next'" :key="'next'" class="max-w-4xl w-full">
            <h2 class="text-4xl font-bold mb-8 text-center">Plany na następny sprint</h2>

            <div class="prose prose-invert prose-lg max-w-none text-white/80 whitespace-pre-wrap">
              {{ sprint.nextSprintPlans }}
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
