<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadSprintList, loadCurrentSprintInfo } from '../services/dataLoader'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle'])

const route = useRoute()
const router = useRouter()
const sprints = ref([])
const currentSprintId = ref(null)
const loading = ref(true)

const loadSprints = async () => {
  loading.value = true
  try {
    const [sprintList, currentInfo] = await Promise.all([
      loadSprintList(),
      loadCurrentSprintInfo()
    ])
    sprints.value = sprintList
    currentSprintId.value = currentInfo.currentSprintId
    return { sprintList, currentInfo }
  } catch (error) {
    console.error('Failed to load sprint list:', error)
    throw error
  } finally {
    loading.value = false
  }
}

const refreshSprints = async () => {
  await loadSprints()
}

// Expose refresh method for parent components
defineExpose({ refreshSprints })

onMounted(async () => {
  try {
    const { currentInfo } = await loadSprints()

    // Navigate to current sprint if no sprint selected
    if (!route.params.sprintId && currentInfo.currentSprintId) {
      router.replace({ name: 'sprint', params: { sprintId: currentInfo.currentSprintId } })
    }
  } catch (error) {
    // Error already logged in loadSprints
  }
})

const activeSprints = computed(() =>
  sprints.value.filter(s => s.status === 'active')
)

const closedSprints = computed(() =>
  sprints.value.filter(s => s.status === 'closed')
)

const isCurrentSprint = (sprintId) => sprintId === currentSprintId.value
const isActiveSprint = (sprintId) => route.params.sprintId == sprintId

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}
</script>

<template>
  <aside
    class="fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col shadow-lg"
    :class="collapsed ? 'w-16' : 'w-[280px]'"
  >
    <!-- Header -->
    <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200">
      <h1 v-if="!collapsed" class="text-lg font-semibold text-gray-900">
        Sprint Review
      </h1>
      <button
        @click="emit('toggle')"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        :title="collapsed ? 'Rozwiń' : 'Zwiń'"
      >
        <svg
          class="w-5 h-5 transition-transform"
          :class="{ 'rotate-180': collapsed }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    </div>

    <!-- Sprint list -->
    <nav class="flex-1 overflow-y-auto py-4" v-if="!loading">
      <!-- No sprints message -->
      <div v-if="sprints.length === 0" class="px-4 py-8 text-center">
        <div v-if="!collapsed">
          <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p class="text-sm text-gray-500 mb-2">Brak sprintów</p>
          <p class="text-xs text-gray-400">Zaloguj się i zsynchronizuj dane z Jira</p>
        </div>
        <div v-else class="text-gray-400">
          <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      </div>

      <!-- Active sprints -->
      <div v-if="activeSprints.length > 0" class="mb-4">
        <h2
          v-if="!collapsed"
          class="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
        >
          Aktywne
        </h2>
        <ul>
          <li v-for="sprint in activeSprints" :key="sprint.id">
            <router-link
              :to="{ name: 'sprint', params: { sprintId: sprint.id } }"
              class="flex items-center px-4 py-2.5 text-sm transition-colors"
              :class="[
                isActiveSprint(sprint.id)
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50'
              ]"
              :title="collapsed ? sprint.name : undefined"
            >
              <span
                class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium"
                :class="[
                  isActiveSprint(sprint.id)
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                ]"
              >
                {{ sprint.id }}
              </span>
              <span v-if="!collapsed" class="ml-3 flex-1">
                <span class="block font-medium">{{ sprint.name }}</span>
                <span class="block text-xs text-gray-500">
                  {{ formatDate(sprint.startDate) }} - {{ formatDate(sprint.endDate) }}
                </span>
              </span>
              <span
                v-if="!collapsed && isCurrentSprint(sprint.id)"
                class="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full"
              >
                bieżący
              </span>
            </router-link>
          </li>
        </ul>
      </div>

      <!-- Closed sprints -->
      <div v-if="closedSprints.length > 0">
        <h2
          v-if="!collapsed"
          class="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
        >
          Archiwum
        </h2>
        <ul>
          <li v-for="sprint in closedSprints" :key="sprint.id">
            <router-link
              :to="{ name: 'sprint', params: { sprintId: sprint.id } }"
              class="flex items-center px-4 py-2 text-sm transition-colors"
              :class="[
                isActiveSprint(sprint.id)
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50'
              ]"
              :title="collapsed ? sprint.name : undefined"
            >
              <span
                class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium"
                :class="[
                  isActiveSprint(sprint.id)
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-500'
                ]"
              >
                {{ sprint.id }}
              </span>
              <span v-if="!collapsed" class="ml-3 flex-1">
                <span class="block">{{ sprint.name }}</span>
                <span class="block text-xs text-gray-400">
                  {{ formatDate(sprint.startDate) }} - {{ formatDate(sprint.endDate) }}
                </span>
              </span>
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Loading state -->
    <div v-else class="flex-1 flex items-center justify-center">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
    </div>

  </aside>
</template>
