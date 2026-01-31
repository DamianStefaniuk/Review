<script setup>
import { ref } from 'vue'
import { triggerJiraSyncWorkflow, getLatestWorkflowRun, pollWorkflowStatus } from '../services/githubActionsService'
import { fetchRootFile, updateRootFile } from '../services/repoDataService'
import { loadCurrentSprintInfo } from '../services/dataLoader'

const emit = defineEmits(['sprint-created'])

const syncing = ref(false)
const status = ref(null) // null, 'pending', 'in_progress', 'success', 'failure'
const errorMessage = ref(null)

const startSync = async () => {
  syncing.value = true
  status.value = 'pending'
  errorMessage.value = null

  try {
    // 1. Trigger the Jira sync workflow
    await triggerJiraSyncWorkflow()
    await new Promise(resolve => setTimeout(resolve, 3000))
    status.value = 'in_progress'

    // 2. Get and poll the latest workflow run
    const latestRun = await getLatestWorkflowRun()
    if (!latestRun) throw new Error('Nie znaleziono uruchomienia workflow')

    const result = await pollWorkflowStatus(latestRun.id, {
      interval: 5000,
      timeout: 300000,
      onStatusChange: (run) => {
        status.value = run.status === 'completed' ? run.conclusion : 'in_progress'
      }
    })

    if (!result.success) {
      throw new Error(`Workflow zakończony z: ${result.conclusion}`)
    }

    // 3. Get the newly created sprint info and update current-sprint.json
    const newSprintInfo = await loadCurrentSprintInfo()
    const currentSprintResult = await fetchRootFile('current-sprint.json')
    await updateRootFile('current-sprint.json', {
      currentSprintId: newSprintInfo.currentSprintId,
      isActive: true
    }, currentSprintResult?.sha)

    status.value = 'success'
    emit('sprint-created', newSprintInfo)

    // 4. Reload page after success
    setTimeout(() => window.location.reload(), 1500)

  } catch (error) {
    status.value = 'failure'
    errorMessage.value = error.message || 'Nieznany błąd'
  } finally {
    syncing.value = false
    setTimeout(() => {
      if (status.value === 'success' || status.value === 'failure') {
        status.value = null
        errorMessage.value = null
      }
    }, 5000)
  }
}

const getButtonClass = () => {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 h-10 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]'

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
      return 'Tworzenie sprintu...'
    case 'success':
      return 'Sprint utworzony!'
    case 'failure':
      return 'Błąd tworzenia'
    default:
      return 'Nowy sprint z Jira'
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
      <!-- Plus icon -->
      <svg
        v-if="!syncing && status !== 'success' && status !== 'failure'"
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <!-- Loading spinner -->
      <svg
        v-if="syncing"
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
