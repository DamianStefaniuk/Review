<script setup>
import { ref } from 'vue'
import { login } from '../services/authService'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const status = ref('idle') // idle | loading | awaiting | error | success
const userCode = ref('')
const verificationUri = ref('')
const error = ref('')

async function handleLogin() {
  status.value = 'loading'
  error.value = ''

  try {
    const flow = await login()

    userCode.value = flow.userCode
    verificationUri.value = flow.verificationUri
    status.value = 'awaiting'

    // Wait for authorization
    const authData = await flow.waitForAuth()

    authStore.setAuth(authData)
    status.value = 'success'

  } catch (err) {
    error.value = err.message
    status.value = 'error'
  }
}

function openGitHub() {
  window.open(verificationUri.value, '_blank')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
      <h1 class="text-2xl font-bold text-center mb-6">Sprint Review</h1>

      <!-- Idle / Start -->
      <div v-if="status === 'idle'" class="text-center">
        <p class="text-gray-600 mb-6">
          Zaloguj się przez GitHub, aby uzyskać dostęp do aplikacji.
        </p>
        <button
          @click="handleLogin"
          class="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Zaloguj przez GitHub
        </button>
      </div>

      <!-- Loading -->
      <div v-else-if="status === 'loading'" class="text-center">
        <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">Łączenie z GitHub...</p>
      </div>

      <!-- Awaiting user action -->
      <div v-else-if="status === 'awaiting'" class="text-center">
        <p class="text-gray-600 mb-4">
          Wejdź na stronę GitHub i wpisz kod:
        </p>

        <div class="bg-gray-100 rounded-lg p-4 mb-4">
          <code class="text-2xl font-mono font-bold tracking-wider">
            {{ userCode }}
          </code>
        </div>

        <button
          @click="openGitHub"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 mb-4"
        >
          Otwórz github.com/login/device
        </button>

        <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
          <div class="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          Oczekiwanie na autoryzację...
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="status === 'error'" class="text-center">
        <div class="text-red-500 mb-4">
          <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {{ error }}
        </div>
        <button
          @click="status = 'idle'"
          class="text-blue-600 hover:text-blue-700"
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  </div>
</template>
