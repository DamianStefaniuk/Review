<script setup>
import { ref, computed } from 'vue'
import { isGistConfigured } from '../services/gistService'

const isConfigured = computed(() => isGistConfigured())
const showDetails = ref(false)
</script>

<template>
  <div class="relative">
    <!-- Status badge / button -->
    <button
      @click="showDetails = !showDetails"
      class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors min-w-[160px]"
      :class="isConfigured
        ? 'text-green-700 bg-green-100 hover:bg-green-200'
        : 'text-amber-700 bg-amber-100 hover:bg-amber-200'"
      :title="isConfigured ? 'Gist skonfigurowany' : 'Gist wymaga konfiguracji - kliknij po szczegóły'"
    >
      <svg v-if="isConfigured" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span class="hidden sm:inline">Gist</span>
    </button>

    <!-- Dropdown with details -->
    <Teleport to="body">
      <div
        v-if="showDetails"
        class="fixed inset-0 z-50"
        @click="showDetails = false"
      >
        <div class="absolute inset-0 bg-black/20"></div>
        <div
          class="absolute top-20 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200"
          @click.stop
        >
          <!-- Header -->
          <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Status konfiguracji Gist</h3>
            <button
              @click="showDetails = false"
              class="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-4">
            <!-- Configured state -->
            <div v-if="isConfigured" class="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="font-medium text-green-800">Gist jest skonfigurowany</p>
                <p class="text-sm text-green-700 mt-1">
                  Dane sprintów i komentarze są automatycznie synchronizowane z GitHub Gist.
                </p>
              </div>
            </div>

            <!-- Not configured state -->
            <div v-else>
              <div class="flex items-start gap-3 p-3 bg-amber-50 rounded-lg mb-4">
                <svg class="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p class="font-medium text-amber-800">Gist wymaga konfiguracji</p>
                  <p class="text-sm text-amber-700 mt-1">
                    Dane sprintów nie będą dostępne dopóki Gist nie zostanie skonfigurowany.
                  </p>
                </div>
              </div>

              <h4 class="font-medium text-gray-800 mb-2 text-sm">Jak skonfigurować:</h4>
              <ol class="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>
                  Przejdź do <strong>Settings</strong> → <strong>Secrets and variables</strong> → <strong>Actions</strong> w repozytorium
                </li>
                <li>
                  Dodaj secret <code class="bg-gray-100 px-1 rounded text-xs">GIST_ID</code> z ID Twojego Gista
                </li>
                <li>
                  Dodaj secret <code class="bg-gray-100 px-1 rounded text-xs">GIST_TOKEN</code> z tokenem GitHub (uprawnienie: gist)
                </li>
                <li>
                  Uruchom ponownie workflow <strong>Deploy</strong> lub wykonaj push do main
                </li>
              </ol>

              <div class="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                <strong>Info:</strong> Konfiguracja odbywa się przez repository secrets, nie przez UI aplikacji.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
