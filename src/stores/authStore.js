import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Load from sessionStorage on startup
  function loadFromStorage() {
    const stored = sessionStorage.getItem('auth')
    if (stored) {
      const data = JSON.parse(stored)
      user.value = data.user
      token.value = data.token
    }
  }

  // Save to sessionStorage
  function saveToStorage() {
    if (user.value && token.value) {
      sessionStorage.setItem('auth', JSON.stringify({
        user: user.value,
        token: token.value
      }))
    }
  }

  // Set auth data after login
  function setAuth(authData) {
    user.value = authData.user
    token.value = authData.token
    saveToStorage()
  }

  // Logout
  function logout() {
    user.value = null
    token.value = null
    sessionStorage.removeItem('auth')
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    loadFromStorage,
    setAuth,
    logout
  }
})
