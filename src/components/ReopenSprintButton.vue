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
    default: 'closed'
  }
})

const emit = defineEmits(['sprint-reopened'])

const { queueReopenSprint } = useOperationQueue()

const showModal = ref(false)
const processing = ref(false)
const error = ref(null)
const success = ref(false)

const openModal = () => {
  if (!isRepoDataConfigured()) {
    error.value = 'Nie jesteś zalogowany. Zaloguj się, aby otworzyć sprint.'
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

const handleReopenSprint = async () => {
  processing.value = true
  error.value = null

  try {
    const result = await queueReopenSprint(props.sprintId, {
      onRetry: (attempt, maxRetries) => {
        error.value = `Konflikt danych, ponawiam (${attempt}/${maxRetries})...`
      }
    })

    success.value = true
    emit('sprint-reopened', result.reopenedSprint)

    // Close modal after success
    setTimeout(() => {
      closeModal()
      // Reload page to see changes
      window.location.reload()
    }, 1500)
  } catch (err) {
    error.value = err.message || 'Wystąpił błąd podczas otwierania sprintu'
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="relative">
    <!-- Button - only show for closed sprints -->
    <button
      v-if="sprintStatus === 'closed'"
      @click="openModal"
      class="inline-flex items-center justify-center gap-2 px-4 py-2 h-10 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors min-w-[160px]"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span>Otwórz sprint</span>
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
            <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Otwórz sprint</h3>
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
            <p class="text-green-700 font-medium">Sprint został ponownie otwarty!</p>
          </div>

          <!-- Form -->
          <div v-else>
            <p class="text-gray-600 mb-4">
              Czy na pewno chcesz ponownie otworzyć ten sprint? Ta operacja przywróci sprint jako aktywny.
            </p>

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
                @click="handleReopenSprint"
                :disabled="processing"
                class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                <span>{{ processing ? 'Otwieranie...' : 'Otwórz sprint' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
