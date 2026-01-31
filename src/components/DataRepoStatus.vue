<script setup>
import { ref, computed } from 'vue'
import { isRepoDataConfigured } from '../services/repoDataService'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const isConfigured = computed(() => isRepoDataConfigured())
const showDetails = ref(false)
const activeTab = ref('user') // 'user' or 'admin'
</script>

<template>
  <div class="relative">
    <!-- Status badge / button -->
    <button
      @click="showDetails = !showDetails"
      class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors min-w-[160px]"
      :class="isConfigured
        ? 'text-purple-700 bg-purple-100 hover:bg-purple-200'
        : 'text-amber-700 bg-amber-100 hover:bg-amber-200'"
      :title="isConfigured ? 'Połączenie aktywne' : 'Wymagane logowanie - kliknij po szczegóły'"
    >
      <svg v-if="isConfigured" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span class="hidden sm:inline">Dane</span>
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
          class="absolute top-20 right-4 w-full sm:w-[480px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col"
          @click.stop
        >
          <!-- Header -->
          <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h3 class="font-semibold text-gray-900">Repozytorium danych (Review-Data)</h3>
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
          <div class="p-4 overflow-y-auto flex-1">
            <!-- Configured state -->
            <div v-if="isConfigured">
              <div class="flex items-start gap-3 p-3 bg-green-50 rounded-lg mb-4">
                <svg class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p class="font-medium text-green-800">Połączenie aktywne</p>
                  <p class="text-sm text-green-700 mt-1">
                    Dane sprintów i komentarze są synchronizowane z prywatnym repozytorium.
                  </p>
                  <p class="text-sm text-green-600 mt-2">
                    Zalogowany jako: <strong>{{ authStore.user?.login || 'Nieznany' }}</strong>
                  </p>
                </div>
              </div>
            </div>

            <!-- Not configured state -->
            <div v-else>
              <div class="flex items-start gap-3 p-3 bg-amber-50 rounded-lg mb-4">
                <svg class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p class="font-medium text-amber-800">Wymagane logowanie</p>
                  <p class="text-sm text-amber-700 mt-1">
                    Zaloguj się przez GitHub PAT, aby uzyskać dostęp do danych sprintów.
                  </p>
                </div>
              </div>

              <!-- Tabs -->
              <div class="flex gap-2 mb-4 border-b border-gray-200">
                <button
                  @click="activeTab = 'user'"
                  class="px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
                  :class="activeTab === 'user' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                >
                  Dla użytkownika
                </button>
                <button
                  @click="activeTab = 'admin'"
                  class="px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
                  :class="activeTab === 'admin' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                >
                  Dla administratora
                </button>
              </div>

              <!-- User instructions -->
              <div v-if="activeTab === 'user'">
                <h4 class="font-medium text-gray-800 mb-3 text-sm">Jak uzyskać dostęp (dla użytkownika):</h4>

                <div class="space-y-3 text-sm">
                  <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-medium text-gray-800 mb-1">1. Utwórz Personal Access Token</p>
                    <p class="text-gray-600 text-xs mb-2">
                      Przejdź do <a href="https://github.com/settings/tokens/new" target="_blank" class="text-primary-600 hover:underline">github.com/settings/tokens/new</a>
                    </p>
                    <p class="text-gray-600 text-xs">Wymagane uprawnienia:</p>
                    <ul class="list-disc list-inside text-xs text-gray-600 ml-2">
                      <li><code class="bg-white px-1 rounded">repo</code> - dostęp do prywatnego repozytorium</li>
                      <li><code class="bg-white px-1 rounded">read:org</code> - weryfikacja członkostwa w organizacji</li>
                      <li><code class="bg-white px-1 rounded">workflow</code> - uruchamianie synchronizacji (opcjonalne)</li>
                    </ul>
                  </div>

                  <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-medium text-gray-800 mb-1">2. Zaloguj się w aplikacji</p>
                    <p class="text-gray-600 text-xs">
                      Wklej token w formularzu logowania. Token jest przechowywany tylko lokalnie w Twojej przeglądarce.
                    </p>
                  </div>

                  <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-medium text-gray-800 mb-1">3. Gotowe!</p>
                    <p class="text-gray-600 text-xs">
                      Dane zostaną automatycznie pobrane z repozytorium <code class="bg-white px-1 rounded">Review-Data</code>.
                    </p>
                  </div>
                </div>

                <div class="mt-4 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <strong>Uwaga:</strong> Musisz być członkiem organizacji <code class="bg-blue-100 px-1 rounded">plumspzoo</code> z dostępem do repozytorium Review-Data.
                </div>
              </div>

              <!-- Admin instructions -->
              <div v-if="activeTab === 'admin'">
                <h4 class="font-medium text-gray-800 mb-3 text-sm">Konfiguracja repozytorium (dla administratora):</h4>

                <div class="space-y-3 text-sm">
                  <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-medium text-gray-800 mb-1">1. Utwórz prywatne repozytorium</p>
                    <p class="text-gray-600 text-xs mb-2">
                      Utwórz repozytorium <code class="bg-white px-1 rounded">Review-Data</code> w organizacji <code class="bg-white px-1 rounded">plumspzoo</code>
                    </p>
                  </div>

                  <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-medium text-gray-800 mb-1">2. Utwórz strukturę plików</p>
                    <pre class="text-xs text-gray-600 font-mono bg-white p-2 rounded border mt-1">Review-Data/
├── current-sprint.json  ← w katalogu głównym!
└── sprints/             ← podkatalog na sprinty</pre>
                    <p class="text-gray-600 text-xs mt-2">Zawartość <code class="bg-white px-1 rounded">current-sprint.json</code>:</p>
                    <pre class="text-xs text-gray-600 font-mono bg-white p-2 rounded border mt-1">{
  "currentSprintId": 8663,
  "isActive": true
}</pre>
                  </div>

                  <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-medium text-gray-800 mb-1">3. Skonfiguruj GitHub Actions secrets</p>
                    <p class="text-gray-600 text-xs mb-2">
                      W repozytorium <strong>Review</strong> (nie Review-Data!) dodaj secrets:
                    </p>
                    <ul class="list-disc list-inside text-xs text-gray-600 ml-2">
                      <li><code class="bg-white px-1 rounded">DATA_REPO_OWNER</code> = plumspzoo</li>
                      <li><code class="bg-white px-1 rounded">DATA_REPO_NAME</code> = Review-Data</li>
                      <li><code class="bg-white px-1 rounded">DATA_REPO_TOKEN</code> = PAT z uprawnieniem <code class="bg-white px-1 rounded">repo</code></li>
                    </ul>
                  </div>

                  <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="font-medium text-gray-800 mb-1">4. Uruchom synchronizację z Jira</p>
                    <p class="text-gray-600 text-xs">
                      Workflow <code class="bg-white px-1 rounded">sync-jira-on-demand</code> automatycznie utworzy pliki sprintów.
                    </p>
                  </div>
                </div>

                <div class="mt-4 p-2 bg-amber-50 rounded text-xs text-amber-700">
                  <strong>Ważne:</strong> DATA_REPO_TOKEN to oddzielny token dla GitHub Actions. Każdy użytkownik loguje się własnym PAT.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
