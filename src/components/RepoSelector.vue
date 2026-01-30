<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { loadAvailableRepositories } from '../services/repoDataService'

const authStore = useAuthStore()
const repositories = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    repositories.value = await loadAvailableRepositories()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const selectRepo = (repo) => {
  authStore.setSelectedRepo(repo)
}

const handleLogout = () => {
  authStore.logout()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-2xl w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Sprint Review</h1>
        <p class="text-gray-600 mt-2">Wybierz tablice do przegladania</p>
        <p class="text-sm text-gray-500 mt-1">
          Zalogowano jako: {{ authStore.user?.login }}
          <button @click="handleLogout" class="text-primary-600 hover:underline ml-2">
            (wyloguj)
          </button>
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-gray-600 mt-4">Ladowanie dostepnych tablic...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {{ error }}
      </div>

      <!-- Repository list -->
      <div v-else class="grid gap-4">
        <button
          v-for="repo in repositories"
          :key="repo.id"
          @click="selectRepo(repo)"
          class="bg-white border border-gray-200 rounded-xl p-6 text-left hover:border-primary-500 hover:shadow-md transition-all group"
        >
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                {{ repo.name }}
              </h3>
              <p class="text-gray-600 text-sm mt-1">{{ repo.description }}</p>
              <div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {{ repo.dataRepo.repo }}
                </span>
                <span v-if="repo.jira?.boardName" class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {{ repo.jira.boardName }}
                </span>
              </div>
            </div>
            <svg class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
