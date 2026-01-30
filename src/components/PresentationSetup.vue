<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePdfExport } from '../composables/usePdfExport'

const props = defineProps({
  sprint: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const { isExporting, exportToPdf } = usePdfExport()

const selectedElements = ref(['summary'])

const presentationElements = [
  {
    id: 'summary',
    name: 'Podsumowanie',
    description: 'Tytuł sprintu, okres, stopień ukończenia'
  },
  {
    id: 'goals',
    name: 'Cele główne',
    description: 'Szczegóły celów z postępem i komentarzami'
  },
  {
    id: 'sideGoals',
    name: 'Cele dodatkowe',
    description: 'Lista celów dodatkowych'
  },
  {
    id: 'achievements',
    name: 'Osiągnięcia',
    description: 'Dodatkowe osiągnięcia sprintu'
  },
  {
    id: 'tasks',
    name: 'Zadania',
    description: 'Wszystkie zadania pogrupowane wg statusu'
  },
  {
    id: 'nextPlans',
    name: 'Plany na następny sprint',
    description: 'Informacje o planach'
  }
]

const toggleElement = (elementId) => {
  const index = selectedElements.value.indexOf(elementId)
  if (index === -1) {
    selectedElements.value.push(elementId)
  } else {
    selectedElements.value.splice(index, 1)
  }
}

const isSelected = (elementId) => {
  return selectedElements.value.includes(elementId)
}

const startPresentation = () => {
  if (selectedElements.value.length === 0) return

  router.push({
    name: 'presentation',
    params: { sprintId: props.sprint.id },
    query: { elements: selectedElements.value.join(',') }
  })
}

const handleExportPdf = () => {
  if (selectedElements.value.length === 0) return
  exportToPdf(props.sprint, selectedElements.value)
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-900">Konfiguracja Prezentacji</h2>
    </div>

    <!-- Content -->
    <div class="p-6">
      <p class="text-sm text-gray-600 mb-6">Wybierz elementy do wyświetlenia:</p>

      <!-- Elements list -->
      <div class="space-y-3">
        <div
          v-for="element in presentationElements"
          :key="element.id"
          class="relative flex items-start p-4 rounded-lg border transition-colors cursor-pointer"
          :class="isSelected(element.id)
            ? 'border-primary-300 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'"
          @click="toggleElement(element.id)"
        >
          <div class="flex items-center h-5">
            <input
              type="checkbox"
              :checked="isSelected(element.id)"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
              @click.stop
              @change="toggleElement(element.id)"
            />
          </div>
          <div class="ml-3">
            <label class="text-sm font-medium text-gray-900 cursor-pointer">
              {{ element.name }}
            </label>
            <p class="text-sm text-gray-500">
              {{ element.description }}
            </p>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
      <div class="flex gap-3">
        <!-- PDF Export button -->
        <button
          @click="handleExportPdf"
          :disabled="selectedElements.length === 0 || isExporting"
          class="flex-1 px-4 py-3 text-sm font-medium text-primary-600 bg-white border border-primary-300 hover:bg-primary-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg v-if="!isExporting" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isExporting ? 'Eksportowanie...' : 'Eksport PDF' }}
        </button>

        <!-- Start presentation button -->
        <button
          @click="startPresentation"
          :disabled="selectedElements.length === 0"
          class="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Rozpocznij prezentację
        </button>
      </div>
    </div>
  </div>
</template>
