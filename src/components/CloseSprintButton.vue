<script setup>
import { ref } from 'vue'
import { isRepoDataConfigured } from '../services/repoDataService'
import { useOperationQueue } from '../composables/useOperationQueue'

const props = defineProps({
  sprintId: {
    type: Number,
    required: true
  },
  sprintName: {
    type: String,
    default: ''
  },
  sprintStatus: {
    type: String,
    default: 'active'
  }
})

const emit = defineEmits(['sprint-closed', 'sprint-created'])

const { queueCloseSprint } = useOperationQueue()

const showModal = ref(false)
const createNewSprint = ref(true)
const processing = ref(false)
const error = ref(null)
const success = ref(false)

const openModal = () => {
  if (!isRepoDataConfigured()) {
    error.value = 'Nie jesteś zalogowany. Zaloguj się, aby zamknąć sprint.'
    return
  }
  error.value = null
  success.value = false
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  error.value = null
}

const handleCloseSprint = async () => {
  processing.value = true
  error.value = null

  try {
    const result = await queueCloseSprint(props.sprintId, createNewSprint.value, {
      onRetry: (attempt, maxRetries) => {
        error.value = `Konflikt danych, ponawiam (${attempt}/${maxRetries})...`
      }
    })

    success.value = true
    emit('sprint-closed', result.closedSprint)
    if (createNewSprint.value && result.newSprint) {
      emit('sprint-created', result.newSprint)
    }

    // Close modal after success
    setTimeout(() => {
      closeModal()
      // Reload page to see changes
      window.location.reload()
    }, 1500)
  } catch (err) {
    error.value = err.message || 'Wystąpił błąd podczas zamykania sprintu'
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="relative">
    <!-- Button - only show for active sprints -->
    <button
      v-if="sprintStatus === 'active'"
      @click="openModal"
      class="inline-flex items-center justify-center gap-2 px-4 py-2 h-10 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors min-w-[160px]"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Zamknij sprint</span>
    </button>

    <!-- Error message if repository not configured -->
    <div v-if="error && !showModal" class="absolute top-full left-0 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 max-w-xs z-10">
      {{ error }}
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="closeModal"
        ></div>

        <!-- Modal content -->
        <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          <!-- Header -->
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Zamknij sprint</h3>
              <p class="text-sm text-gray-500">{{ sprintName || `Sprint ${sprintId}` }}</p>
            </div>
          </div>

          <!-- Success state -->
          <div v-if="success" class="text-center py-4">
            <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="text-green-700 font-medium">Sprint został zamknięty!</p>
            <p v-if="createNewSprint" class="text-sm text-gray-500 mt-1">Nowy sprint został utworzony.</p>
          </div>

          <!-- Form -->
          <div v-else>
            <p class="text-gray-600 mb-4">
              Czy na pewno chcesz zamknąć ten sprint? Ta operacja zaznaczy sprint jako zakończony.
            </p>

            <!-- Option to create new sprint -->
            <label class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer mb-4">
              <input
                type="checkbox"
                v-model="createNewSprint"
                class="mt-0.5 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              >
              <div>
                <span class="font-medium text-gray-900">Utwórz nowy sprint</span>
                <p class="text-sm text-gray-500">
                  Automatycznie utworzy Sprint {{ sprintId + 1 }} jako aktywny
                </p>
              </div>
            </label>

            <!-- Error message -->
            <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ error }}
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                @click="closeModal"
                :disabled="processing"
                class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                @click="handleCloseSprint"
                :disabled="processing"
                class="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg
                  v-if="processing"
                  class="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{{ processing ? 'Zamykanie...' : 'Zamknij sprint' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
