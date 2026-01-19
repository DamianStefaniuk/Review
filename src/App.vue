<script setup>
import { ref, provide, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import UserMenu from './components/UserMenu.vue'
import LoginScreen from './components/LoginScreen.vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const sidebarCollapsed = ref(false)
const presentationMode = ref(false)
const route = useRoute()

onMounted(() => {
  authStore.loadFromStorage()
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const togglePresentationMode = () => {
  presentationMode.value = !presentationMode.value
  if (presentationMode.value) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

provide('presentationMode', presentationMode)
provide('togglePresentationMode', togglePresentationMode)
</script>

<template>
  <!-- If not authenticated - show login screen -->
  <LoginScreen v-if="!authStore.isAuthenticated" />

  <!-- If authenticated - show app -->
  <div v-else class="min-h-screen flex" :class="{ 'presentation-mode': presentationMode }">
    <!-- Sidebar -->
    <Sidebar
      v-if="!presentationMode"
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
    />

    <!-- Main content -->
    <main
      class="flex-1 transition-all duration-300"
      :class="{
        'ml-[280px]': !sidebarCollapsed && !presentationMode,
        'ml-16': sidebarCollapsed && !presentationMode
      }"
    >
      <!-- Header with user menu -->
      <header v-if="!presentationMode" class="p-4 border-b flex justify-end bg-white">
        <UserMenu />
      </header>

      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
