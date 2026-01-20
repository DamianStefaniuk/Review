<script setup>
import { ref, onMounted } from 'vue'
import {
  getGistConfig,
  saveGistConfig,
  clearGistConfig,
  isGistConfigured,
  validateGistToken
} from '../services/gistService'

const emit = defineEmits(['config-saved', 'config-cleared'])

const showModal = ref(false)
const gistId = ref('')
const gistToken = ref('')
const validating = ref(false)
const validationError = ref(null)
const isConfigured = ref(false)
const showToken = ref(false)

onMounted(() => {
  loadConfig()
})

const loadConfig = () => {
  const config = getGistConfig()
  if (config) {
    gistId.value = config.gistId || ''
    gistToken.value = config.gistToken || ''
  }
  isConfigured.value = isGistConfigured()
}

const openModal = () => {
  loadConfig()
  validationError.value = null
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  showToken.value = false
}

const handleSave = async () => {
  if (!gistId.value.trim() || !gistToken.value.trim()) {
    validationError.value = 'Wypełnij wszystkie pola'
    return
  }

  validating.value = true
  validationError.value = null

  try {
    // Validate token by trying to fetch the Gist
    const isValid = await validateGistToken(gistId.value.trim(), gistToken.value.trim())

    if (!isValid) {
      validationError.value = 'Nieprawidłowy token lub ID Gista. Sprawdź dane i spróbuj ponownie.'
      return
    }

    // Save config
    saveGistConfig(gistId.value.trim(), gistToken.value.trim())
    isConfigured.value = true
    emit('config-saved')
    closeModal()
  } catch (error) {
    validationError.value = error.message || 'Błąd walidacji tokena'
  } finally {
    validating.value = false
  }
}

const handleClear = () => {
  clearGistConfig()
  gistId.value = ''
  gistToken.value = ''
  isConfigured.value = false
  emit('config-cleared')
  closeModal()
}

const toggleTokenVisibility = () => {
  showToken.value = !showToken.value
}
</script>

<template>
  <div>
    <!-- Config button -->
    <button
      @click="openModal"
      class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
      :class="isConfigured
        ? 'text-green-700 bg-green-100 hover:bg-green-200'
        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span>Gist {{ isConfigured ? '(skonfigurowany)' : '(wymaga konfiguracji)' }}</span>
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="closeModal"
        ></div>

        <!-- Modal content -->
        <div class="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
            <h3 class="text-lg font-semibold text-gray-900">Konfiguracja GitHub Gist</h3>
            <p class="text-sm text-gray-500 mt-1">
              Skonfiguruj dostęp do Gista, gdzie przechowywane są dane sprintów
            </p>
          </div>

          <!-- Body -->
          <div class="px-6 py-4 space-y-4">
            <!-- Instructions -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <h4 class="font-medium text-blue-800 mb-2">Jak utworzyć Gist i token:</h4>
              <ol class="list-decimal list-inside space-y-1 text-blue-700">
                <li>Przejdź do <a href="https://gist.github.com" target="_blank" class="underline">gist.github.com</a></li>
                <li>Utwórz nowy Gist prywatny</li>
                <li>Dodaj plik <code class="bg-blue-100 px-1 rounded">current-sprint.json</code> z przykładową zawartością (patrz poniżej)</li>
                <li>Skopiuj ID Gista z URL (ciąg znaków po nazwie użytkownika)</li>
                <li>Utwórz Personal Access Token na <a href="https://github.com/settings/tokens/new" target="_blank" class="underline">GitHub Settings</a></li>
                <li>Zaznacz tylko uprawnienie <code class="bg-blue-100 px-1 rounded">gist</code></li>
              </ol>
            </div>

            <!-- Example file content -->
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 class="font-medium text-gray-800 mb-2 text-sm">Przykładowa zawartość pliku <code class="bg-gray-200 px-1 rounded">current-sprint.json</code>:</h4>
              <pre class="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto"><code>{
  "currentSprintId": 42,
  "isActive": true
}</code></pre>
              <p class="mt-2 text-xs text-gray-500">
                Zmień <code class="bg-gray-200 px-1 rounded">42</code> na numer aktualnego sprintu w Twoim projekcie.
              </p>
            </div>

            <!-- Gist ID input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Gist ID
              </label>
              <input
                v-model="gistId"
                type="text"
                placeholder="np. abc123def456..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
              <p class="mt-1 text-xs text-gray-500">
                ID znajdziesz w URL Gista: gist.github.com/username/<strong>GIST_ID</strong>
              </p>
            </div>

            <!-- Token input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Personal Access Token
              </label>
              <div class="relative">
                <input
                  v-model="gistToken"
                  :type="showToken ? 'text' : 'password'"
                  placeholder="ghp_xxxxxxxxxxxx"
                  class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <button
                  type="button"
                  @click="toggleTokenVisibility"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg v-if="!showToken" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Token musi mieć uprawnienie <strong>gist</strong>
              </p>
            </div>

            <!-- Validation error -->
            <div v-if="validationError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {{ validationError }}
            </div>

            <!-- Current status -->
            <div v-if="isConfigured" class="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Gist jest aktualnie skonfigurowany</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex gap-3">
            <button
              v-if="isConfigured"
              @click="handleClear"
              class="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              Usuń konfigurację
            </button>
            <div class="flex-1"></div>
            <button
              @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Anuluj
            </button>
            <button
              @click="handleSave"
              :disabled="validating"
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg
                v-if="validating"
                class="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{{ validating ? 'Sprawdzanie...' : 'Zapisz' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
