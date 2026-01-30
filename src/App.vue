<script setup>
import { ref, provide, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import UserMenu from './components/UserMenu.vue'
import LoginScreen from './components/LoginScreen.vue'
import RepoSelector from './components/RepoSelector.vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const sidebarCollapsed = ref(false)
const presentationMode = ref(false)
const route = useRoute()
const sidebarRef = ref(null)

// Portrait mode detection
const windowWidth = ref(window.innerWidth)
const isPortrait = computed(() => windowWidth.value < 768)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  authStore.loadFromStorage()
  window.addEventListener('resize', handleResize)
  // Auto-collapse sidebar on portrait
  if (isPortrait.value) {
    sidebarCollapsed.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
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

const refreshSidebar = async () => {
  if (sidebarRef.value?.refreshSprints) {
    await sidebarRef.value.refreshSprints()
  }
}

provide('presentationMode', presentationMode)
provide('togglePresentationMode', togglePresentationMode)
provide('refreshSidebar', refreshSidebar)
</script>

<template>
  <!-- If not authenticated - show login screen -->
  <LoginScreen v-if="!authStore.isAuthenticated" />

  <!-- If authenticated but no repo selected - show repo selector -->
  <RepoSelector v-else-if="!authStore.hasSelectedRepo" />

  <!-- If authenticated and repo selected - show app -->
  <div v-else class="min-h-screen flex" :class="{ 'presentation-mode': presentationMode }">
    <!-- Sidebar -->
    <Sidebar
      ref="sidebarRef"
      v-if="!presentationMode"
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
    />

    <!-- Overlay for portrait mode when sidebar is open -->
    <div
      v-if="isPortrait && !sidebarCollapsed && !presentationMode"
      class="fixed inset-0 bg-black/30 z-30"
      @click="sidebarCollapsed = true"
    ></div>

    <!-- Main content -->
    <main
      class="flex-1 transition-all duration-300"
      :class="{
        'ml-[280px]': !sidebarCollapsed && !presentationMode && !isPortrait,
        'ml-16': (sidebarCollapsed || isPortrait) && !presentationMode,
        'ml-0': presentationMode
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
