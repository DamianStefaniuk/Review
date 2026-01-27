<script setup>
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
</script>

<template>
  <div v-if="authStore.isAuthenticated" class="flex items-center gap-3">
    <img
      :src="authStore.user.avatarUrl"
      :alt="authStore.user.login"
      class="w-8 h-8 rounded-full"
    />
    <span class="text-sm text-gray-700">{{ authStore.user.name || authStore.user.login }}</span>
    <button
      v-if="authStore.hasSelectedRepo"
      @click="authStore.clearSelectedRepo()"
      class="text-sm text-gray-500 hover:text-gray-700"
    >
      Zmień tablice
    </button>
    <button
      @click="authStore.logout()"
      class="text-sm text-gray-500 hover:text-gray-700"
    >
      Wyloguj
    </button>
  </div>
</template>
