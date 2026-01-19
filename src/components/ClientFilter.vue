<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  clients: {
    type: Array,
    required: true
  },
  modelValue: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

const selectedLabel = computed(() => {
  return props.modelValue || 'Wszyscy klienci'
})

const selectClient = (client) => {
  emit('update:modelValue', client)
  isOpen.value = false
}

const clearSelection = () => {
  emit('update:modelValue', null)
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      <span>{{ selectedLabel }}</span>
      <svg
        class="w-4 h-4 text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
    >
      <div class="p-2">
        <button
          @click="clearSelection"
          class="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
          :class="!modelValue ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'"
        >
          Wszyscy klienci
        </button>
        <hr class="my-2 border-gray-100" v-if="clients.length > 0" />
        <button
          v-for="client in clients"
          :key="client"
          @click="selectClient(client)"
          class="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors"
          :class="modelValue === client ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'"
        >
          {{ client }}
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    ></div>
  </div>
</template>
