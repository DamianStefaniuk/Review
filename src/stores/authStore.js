import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Generate a cryptographically secure session nonce
 * @returns {string} 32-character hex string
 */
function generateSessionNonce() {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const sessionNonce = ref(null)
  const selectedRepo = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const hasSelectedRepo = computed(() => !!selectedRepo.value)

  // Load from sessionStorage on startup
  function loadFromStorage() {
    const stored = sessionStorage.getItem('auth')
    if (stored) {
      const data = JSON.parse(stored)
      user.value = data.user
      token.value = data.token
      selectedRepo.value = data.selectedRepo || null
      // Generate new nonce for each session load (security best practice)
      sessionNonce.value = generateSessionNonce()
    }
  }

  // Save to sessionStorage
  function saveToStorage() {
    if (user.value && token.value) {
      sessionStorage.setItem('auth', JSON.stringify({
        user: user.value,
        token: token.value,
        selectedRepo: selectedRepo.value
      }))
    }
  }

  // Set selected repository
  function setSelectedRepo(repo) {
    selectedRepo.value = repo
    saveToStorage()
  }

  // Clear selected repository (return to selection)
  function clearSelectedRepo() {
    selectedRepo.value = null
    saveToStorage()
  }

  // Set auth data after login
  function setAuth(authData) {
    user.value = authData.user
    token.value = authData.token
    sessionNonce.value = generateSessionNonce()
    saveToStorage()
  }

  // Logout
  function logout() {
    user.value = null
    token.value = null
    sessionNonce.value = null
    selectedRepo.value = null
    sessionStorage.removeItem('auth')
  }

  return {
    user,
    token,
    selectedRepo,
    isAuthenticated,
    hasSelectedRepo,
    loadFromStorage,
    setAuth,
    logout,
    setSelectedRepo,
    clearSelectedRepo
  }
})
