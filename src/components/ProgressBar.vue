<script setup>
import { computed } from 'vue'

const props = defineProps({
  percent: {
    type: Number,
    required: true,
    validator: (value) => value >= 0 && value <= 100
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  animated: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: null,
    validator: (value) => !value || ['primary', 'amber', 'green', 'blue', 'red'].includes(value)
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-1.5'
    case 'lg': return 'h-4'
    default: return 'h-2.5'
  }
})

const colorClass = computed(() => {
  // If custom color is provided, use it (with completion override)
  if (props.color) {
    if (props.percent === 100) return 'bg-green-500'
    const colorMap = {
      primary: 'bg-primary-500',
      amber: 'bg-amber-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      red: 'bg-red-500'
    }
    return colorMap[props.color] || 'bg-primary-500'
  }

  // Default color based on progress
  if (props.percent === 100) return 'bg-green-500'
  if (props.percent >= 75) return 'bg-primary-500'
  if (props.percent >= 50) return 'bg-yellow-500'
  if (props.percent >= 25) return 'bg-orange-500'
  return 'bg-red-500'
})
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="flex-1 bg-gray-200 rounded-full overflow-hidden" :class="sizeClasses">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :class="[colorClass, { 'animate-pulse': animated && percent < 100 }]"
        :style="{ width: `${percent}%` }"
      ></div>
    </div>
    <span
      v-if="showLabel"
      class="text-sm font-medium min-w-[3rem] text-right"
      :class="percent === 100 ? 'text-green-600' : 'text-gray-600'"
    >
      {{ percent }}%
    </span>
  </div>
</template>
