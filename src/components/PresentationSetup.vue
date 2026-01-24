<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  sprint: {
    type: Object,
    required: true
  }
})

const router = useRouter()

const selectedElements = ref(['summary'])

const presentationElements = [
  {
    id: 'summary',
    name: 'Podsumowanie',
    description: 'Tytuł sprintu, okres, stopień ukończenia, informacje o celach'
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

      <!-- Info about future elements -->
      <div class="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
        <p>Dodatkowe elementy prezentacji (cele, zadania, osiągnięcia) będą dostępne w przyszłych wersjach.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
      <button
        @click="startPresentation"
        :disabled="selectedElements.length === 0"
        class="w-full px-4 py-3 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Rozpocznij prezentację
      </button>
    </div>
  </div>
</template>
