import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Load from localStorage on startup
  function loadFromStorage() {
    const stored = localStorage.getItem('auth')
    if (stored) {
      const data = JSON.parse(stored)
      user.value = data.user
      token.value = data.token
    }
  }

  // Save to localStorage
  function saveToStorage() {
    if (user.value && token.value) {
      localStorage.setItem('auth', JSON.stringify({
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
    localStorage.removeItem('auth')
  }

  return {
    user,
    token,
    isAuthenticated,
    loadFromStorage,
    setAuth,
    logout
  }
})
