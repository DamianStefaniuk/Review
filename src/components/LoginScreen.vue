<script setup>
import { ref } from 'vue'
import { loginWithPAT } from '../services/authService'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const status = ref('instructions') // instructions | token-input | loading | error
const tokenInput = ref('')
const error = ref('')
const showToken = ref(false)

async function handleLogin() {
  if (!tokenInput.value.trim()) {
    error.value = 'Wprowadź token'
    return
  }

  status.value = 'loading'
  error.value = ''

  try {
    const authData = await loginWithPAT(tokenInput.value.trim())
    authStore.setAuth(authData)
  } catch (err) {
    error.value = err.message
    status.value = 'error'
  }
}

function goToTokenInput() {
  status.value = 'token-input'
}

function goBack() {
  status.value = 'instructions'
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <div class="bg-white rounded-xl shadow-lg max-w-2xl w-full overflow-hidden">

      <!-- Header -->
      <div class="bg-gray-900 text-white p-6 text-center">
        <h1 class="text-2xl font-bold">Sprint Review</h1>
        <p class="text-gray-400 text-sm mt-1">Zaloguj się aby kontynuować</p>
      </div>

      <div class="p-6">

        <!-- Instructions -->
        <div v-if="status === 'instructions'">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span class="bg-blue-100 text-blue-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">?</span>
            Jak utworzyć token dostępu (PAT)
          </h2>

          <div class="space-y-4 mb-6">
            <div class="flex gap-3">
              <span class="bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <div>
                <p class="font-medium">Otwórz ustawienia GitHub</p>
                <p class="text-sm text-gray-600">
                  Przejdź do
                  <a href="https://github.com/settings/tokens/new" target="_blank" class="text-blue-600 hover:underline font-medium">
                    github.com/settings/tokens/new
                  </a>
                </p>
              </div>
            </div>

            <div class="flex gap-3">
              <span class="bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <div>
                <p class="font-medium">Wypełnij formularz</p>
                <ul class="text-sm text-gray-600 mt-1 space-y-1">
                  <li><strong>Note:</strong> np. "Sprint Review App"</li>
                  <li><strong>Expiration:</strong> wybierz okres ważności (np. 90 dni)</li>
                </ul>
              </div>
            </div>

            <div class="flex gap-3">
              <span class="bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <div>
                <p class="font-medium">Zaznacz uprawnienia</p>
                <p class="text-sm text-gray-600">W sekcji "Select scopes" zaznacz:</p>
                <ul class="text-sm text-gray-600 mt-1 space-y-1 ml-4 list-disc">
                  <li><strong>repo</strong> (cała sekcja repo) - w celu dostępu do bazy danych na prywatnym repozytorium</li>
                  <li><strong>read:org</strong> (w sekcji "admin:org") - do weryfikacji członkostwa</li>
                  <li><strong>workflow</strong> - do uruchamiania synchronizacji Jira</li>
                </ul>
              </div>
            </div>

            <div class="flex gap-3">
              <span class="bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
              <div>
                <p class="font-medium">Wygeneruj i skopiuj token</p>
                <p class="text-sm text-gray-600">
                  Kliknij "Generate token" na dole strony, a następnie <strong>skopiuj token</strong> - zobaczysz go tylko raz!
                </p>
              </div>
            </div>
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div class="flex gap-2">
              <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div class="text-sm text-amber-800">
                <p class="font-medium">Ważne</p>
                <p>Token będzie przechowywany lokalnie w Twojej przeglądarce. Nie udostępniaj go nikomu.</p>
              </div>
            </div>
          </div>

          <button
            @click="goToTokenInput"
            class="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 font-medium"
          >
            Mam token - przejdź dalej
          </button>
        </div>

        <!-- Token Input -->
        <div v-else-if="status === 'token-input' || status === 'error'">
          <button
            @click="goBack"
            class="text-gray-500 hover:text-gray-700 text-sm mb-4 flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Wróć do instrukcji
          </button>

          <h2 class="text-lg font-semibold mb-4">Wprowadź token</h2>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Personal Access Token (PAT)
            </label>
            <div class="relative">
              <input
                v-model="tokenInput"
                :type="showToken ? 'text' : 'password'"
                placeholder="github_pat_..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 font-mono text-sm"
                @keyup.enter="handleLogin"
              />
              <button
                @click="showToken = !showToken"
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg v-if="showToken" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Error message -->
          <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex gap-2 text-red-700">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-sm">{{ error }}</span>
            </div>
          </div>

          <button
            @click="handleLogin"
            class="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 font-medium flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Zaloguj się
          </button>
        </div>

        <!-- Loading -->
        <div v-else-if="status === 'loading'" class="text-center py-8">
          <div class="animate-spin w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-600">Weryfikacja tokena...</p>
        </div>

      </div>
    </div>
  </div>
</template>
