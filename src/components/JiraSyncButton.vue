<script setup>
import { ref } from 'vue'
import { triggerJiraSyncWorkflow, getLatestWorkflowRun, pollWorkflowStatus } from '../services/githubActionsService'

const emit = defineEmits(['sync-complete'])

const syncing = ref(false)
const status = ref(null) // null, 'pending', 'in_progress', 'success', 'failure'
const errorMessage = ref(null)

const startSync = async () => {
  syncing.value = true
  status.value = 'pending'
  errorMessage.value = null

  try {
    // Trigger the workflow
    await triggerJiraSyncWorkflow()

    // Wait for workflow to start
    await new Promise(resolve => setTimeout(resolve, 3000))

    status.value = 'in_progress'

    // Get the latest run
    const latestRun = await getLatestWorkflowRun()

    if (!latestRun) {
      throw new Error('Nie znaleziono uruchomienia workflow')
    }

    // Poll for completion
    const result = await pollWorkflowStatus(latestRun.id, {
      interval: 5000,
      timeout: 300000,
      onStatusChange: (run) => {
        status.value = run.status === 'completed' ? run.conclusion : 'in_progress'
      }
    })

    if (result.success) {
      status.value = 'success'
      emit('sync-complete', { success: true })
    } else {
      status.value = 'failure'
      errorMessage.value = `Workflow zakończony z: ${result.conclusion}`
    }
  } catch (error) {
    status.value = 'failure'
    errorMessage.value = error.message || 'Nieznany błąd'
  } finally {
    syncing.value = false

    // Reset status after 5 seconds
    setTimeout(() => {
      if (status.value === 'success' || status.value === 'failure') {
        status.value = null
        errorMessage.value = null
      }
    }, 5000)
  }
}

const getButtonClass = () => {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 h-10 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]'

  switch (status.value) {
    case 'success':
      return `${base} bg-green-100 text-green-700`
    case 'failure':
      return `${base} bg-red-100 text-red-700`
    default:
      return `${base} bg-blue-100 text-blue-700 hover:bg-blue-200`
  }
}

const getButtonText = () => {
  switch (status.value) {
    case 'pending':
      return 'Uruchamianie...'
    case 'in_progress':
      return 'Synchronizacja...'
    case 'success':
      return 'Zsynchronizowano!'
    case 'failure':
      return 'Błąd synchronizacji'
    default:
      return 'Synchronizuj z Jira'
  }
}
</script>

<template>
  <div class="relative">
    <button
      @click="startSync"
      :disabled="syncing"
      :class="getButtonClass()"
      :title="errorMessage || ''"
    >
      <!-- Sync icon -->
      <svg
        v-if="!syncing"
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>

      <!-- Loading spinner -->
      <svg
        v-else
        class="w-4 h-4 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      <!-- Check icon for success -->
      <svg
        v-if="status === 'success'"
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 13l4 4L19 7"
        />
      </svg>

      <!-- Error icon for failure -->
      <svg
        v-if="status === 'failure'"
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>

      <span>{{ getButtonText() }}</span>
    </button>

    <!-- Error tooltip -->
    <div
      v-if="errorMessage && status === 'failure'"
      class="absolute top-full left-0 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 max-w-xs z-10"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>
