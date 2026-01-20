# Sprint Review - GitHub Pages Application

Aplikacja webowa do prezentacji i archiwizacji review sprintów zespołu. Integracja z Jira do pobierania danych o sprintach, celach i zadaniach.

## Spis treści

- [Funkcjonalności](#funkcjonalności)
- [Instrukcja krok po kroku](#instrukcja-krok-po-kroku)
  - [Krok 1: Utworzenie repozytorium GitHub](#krok-1-utworzenie-repozytorium-github)
  - [Krok 2: Utworzenie tokena Jira API](#krok-2-utworzenie-tokena-jira-api)
  - [Krok 3: Znalezienie ID tablicy i klucza projektu Jira](#krok-3-znalezienie-id-tablicy-i-klucza-projektu-jira)
  - [Krok 4: Konfiguracja Secrets w GitHub](#krok-4-konfiguracja-secrets-w-github)
  - [Krok 5: Konfiguracja aplikacji](#krok-5-konfiguracja-aplikacji)
  - [Krok 6: Push kodu do GitHub](#krok-6-push-kodu-do-github)
  - [Krok 7: Włączenie GitHub Pages](#krok-7-włączenie-github-pages)
  - [Krok 8: Dostęp do aplikacji](#krok-8-dostęp-do-aplikacji)
- [Autoryzacja GitHub (Personal Access Token)](#autoryzacja-github-personal-access-token)
- [Uruchomienie lokalne](#uruchomienie-lokalne)
- [Format opisu sprintu w Jira](#format-opisu-sprintu-w-jira)
- [Używanie aplikacji](#używanie-aplikacji)
- [Struktura projektu](#struktura-projektu)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Funkcjonalności

- **Przegląd sprintów** - wyświetlanie celów głównych z progress barami
- **Szczegóły celów** - lista zadań, statusy, komentarze
- **Osiągnięcia dodatkowe** - dodatkowe cele zrealizowane w sprincie
- **Wszystkie zadania** - widok wszystkich zadań z sortowaniem i filtrowaniem
- **Filtrowanie po klientach** - grupowanie i filtrowanie po `[NAZWA_KLIENTA]`
- **Tryb prezentacji** - pełnoekranowy tryb do przeprowadzania review
- **Eksport do PDF** - generowanie PDF z aktualnego review
- **Autoryzacja GitHub PAT** - logowanie przez Personal Access Token z kontrolą członkostwa w organizacji
- **Przechowywanie danych w GitHub Gist** - komentarze i dane sprintów przechowywane w Gist (bez commitów do repozytorium)
- **Synchronizacja z Jira na żądanie** - przycisk wyzwalający GitHub Actions workflow
- **Zamykanie sprintu** - możliwość zamknięcia sprintu i utworzenia nowego z poziomu UI

---

## Instrukcja krok po kroku

### Krok 1: Utworzenie repozytorium GitHub

1. Zaloguj się do GitHub (github.com)

2. Kliknij **"+"** w prawym górnym rogu → **"New repository"**

3. Wypełnij formularz:
   - **Repository name:** `sprint-review` (lub dowolna nazwa)
   - **Description:** opcjonalny opis
   - **Visibility:** Private (zalecane) lub Public
   - **Initialize this repository with:** NIE zaznaczaj żadnych opcji

4. Kliknij **"Create repository"**

5. Zanotuj URL repozytorium, np.:
   ```
   https://github.com/twoja-nazwa/sprint-review.git
   ```

---

### Krok 2: Utworzenie tokena Jira API

#### Dla Jira Cloud (Atlassian Cloud):

1. Zaloguj się na https://id.atlassian.com/manage-profile/security/api-tokens

2. Kliknij **"Create API token"**

3. Podaj nazwę tokena, np. `sprint-review-sync`

4. Kliknij **"Create"**

5. **WAŻNE:** Skopiuj token i zapisz go w bezpiecznym miejscu - nie będzie można go ponownie wyświetlić!

6. Zanotuj również:
   - **Email:** Twój email używany do logowania w Jira
   - **URL Jira:** np. `https://twoja-firma.atlassian.net`

#### Dla Jira Server/Data Center:

1. Zaloguj się do Jira

2. Kliknij na swój avatar → **"Profile"**

3. Przejdź do **"Personal Access Tokens"**

4. Kliknij **"Create token"**

5. Podaj nazwę i skopiuj wygenerowany token

---

### Krok 3: Znalezienie ID tablicy i klucza projektu Jira

#### Znalezienie klucza projektu (Project Key):

1. Otwórz swój projekt w Jira

2. Klucz projektu widoczny jest w URL i przy każdym zadaniu:
   ```
   https://twoja-firma.atlassian.net/browse/PROJ-123
                                           ^^^^
                                           To jest klucz projektu (PROJ)
   ```

3. Możesz też przejść do **Project Settings** → klucz widoczny w sekcji "Details"

#### Znalezienie ID tablicy (Board ID):

1. Otwórz tablicę Scrum/Kanban w Jira

2. Spójrz na URL - ID tablicy znajduje się w adresie:
   ```
   https://twoja-firma.atlassian.net/jira/software/projects/PROJ/boards/123
                                                                        ^^^
                                                                        To jest Board ID (123)
   ```

   lub dla starszej wersji Jira:
   ```
   https://twoja-firma.atlassian.net/secure/RapidBoard.jspa?rapidView=123
                                                                      ^^^
                                                                      To jest Board ID (123)
   ```

---

### Krok 4: Konfiguracja Secrets w GitHub

1. Otwórz swoje repozytorium w GitHub

2. Przejdź do **Settings** → **Secrets and variables** → **Actions**

3. Kliknij **"New repository secret"** dla każdego z poniższych:

| Secret | Wartość |
|--------|---------|
| `JIRA_URL` | `https://twoja-firma.atlassian.net` |
| `JIRA_EMAIL` | `twoj.email@firma.com` |
| `JIRA_API_TOKEN` | `twój-token-api` |
| `JIRA_PROJECT_KEY` | `PROJ` |
| `JIRA_BOARD_ID` | `123` |
| `GIST_ID` | ID Gista do przechowywania danych sprintów |
| `GIST_TOKEN` | Personal Access Token z uprawnieniem `gist` |

**Uwaga:** Secrets są automatycznie maskowane w logach workflow.

---

### Krok 5: Konfiguracja aplikacji

Zaktualizuj plik `data/config.json` z danymi GitHub:

```json
{
  "github": {
    "owner": "twoja-organizacja",
    "repo": "sprint-review",
    "branch": "main",
    "organization": "twoja-organizacja"
  },
  "labels": {
    "goalPrefix": "cel",
    "clientPattern": "\\[([^\\]]+)\\]"
  }
}
```

| Pole | Opis |
|------|------|
| `github.owner` | Nazwa użytkownika/organizacji na GitHub |
| `github.repo` | Nazwa repozytorium |
| `github.branch` | Branch główny (zazwyczaj `main`) |
| `github.organization` | Nazwa organizacji do weryfikacji członkostwa |

**Uwaga:** Pole `organization` kontroluje kto może się zalogować. Tylko członkowie tej organizacji uzyskają dostęp.

---

### Krok 6: Push kodu do GitHub

1. Otwórz terminal w folderze projektu

2. Zainicjuj git (jeśli jeszcze nie zainicjowany):
   ```bash
   git init
   ```

3. Dodaj remote:
   ```bash
   git remote add origin https://github.com/twoja-nazwa/sprint-review.git
   ```

4. Dodaj wszystkie pliki:
   ```bash
   git add .
   ```

5. Utwórz commit:
   ```bash
   git commit -m "Initial commit - Sprint Review app"
   ```

6. Push do GitHub:
   ```bash
   git push -u origin main
   ```

7. Po pushu, GitHub automatycznie uruchomi workflow Actions

8. Sprawdź status workflow: zakładka **"Actions"** w repozytorium

---

### Krok 7: Włączenie GitHub Pages

1. W repozytorium przejdź do **Settings** → **Pages**

2. W sekcji **"Build and deployment"**:
   - **Source:** GitHub Actions

3. Zapisz zmiany

4. Workflow automatycznie wdroży stronę po następnym pushu

#### Ręczne uruchomienie synchronizacji:

1. Przejdź do zakładki **Actions**
2. Wybierz workflow **"Deploy to GitHub Pages"**
3. Kliknij **"Run workflow"**
4. Wybierz branch `main`
5. Kliknij **"Run workflow"**

---

### Krok 8: Dostęp do aplikacji

Po udanym deploymencie, aplikacja będzie dostępna pod adresem:

```
https://twoja-nazwa.github.io/sprint-review/
```

#### Jak znaleźć dokładny URL:

1. Przejdź do **Settings** → **Pages**

2. URL będzie wyświetlony w sekcji "Your site is live at"

3. Jeśli nie widzisz tej sekcji:
   - Sprawdź czy workflow zakończył się sukcesem w zakładce Actions
   - Poczekaj kilka minut (pierwszy deploy może trwać dłużej)

---

## Autoryzacja GitHub (Personal Access Token)

Aplikacja używa **Personal Access Token (PAT)** do autoryzacji użytkowników. Jest to metoda 100% client-side, nie wymaga backendu ani OAuth App.

### Jak działa logowanie

```
1. Użytkownik wchodzi na stronę aplikacji
2. Widzi instrukcję jak utworzyć Personal Access Token
3. Tworzy token na GitHub z uprawnieniem read:org
4. Wkleja token w aplikacji
5. Aplikacja weryfikuje token i sprawdza członkostwo w organizacji
6. Jeśli użytkownik należy do organizacji → dostęp przyznany
7. Token jest zapisywany w localStorage (zapamiętany na stałe)
```

### Jak utworzyć Personal Access Token

1. Otwórz [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Wypełnij formularz:
   - **Note:** np. "Sprint Review App"
   - **Expiration:** wybierz okres ważności (np. 90 dni)
3. W sekcji **"Select scopes"** zaznacz:
   - **read:org** (w sekcji "admin:org")
4. Kliknij **"Generate token"**
5. **Skopiuj token** - zobaczysz go tylko raz!

### Kontrola dostępu

Dostęp do aplikacji mają tylko członkowie organizacji GitHub określonej w `config.json`:

```json
{
  "github": {
    "organization": "nazwa-organizacji"
  }
}
```

Użytkownicy spoza organizacji zobaczą komunikat o braku uprawnień.

### Sesja użytkownika

- Token jest przechowywany w **localStorage** (zapamiętany na stałe)
- Sesja nie wygasa po zamknięciu przeglądarki
- Użytkownik może się wylogować klikając przycisk "Wyloguj"
- Token należy odświeżyć przed jego wygaśnięciem

### Wymagane uprawnienia (scope)

Token wymaga minimalnego uprawnienia:
- `read:org` - sprawdzenie członkostwa w organizacji

### Bezpieczeństwo

| Aspekt | Rozwiązanie |
|--------|-------------|
| Token storage | localStorage (przechowywany lokalnie w przeglądarce użytkownika) |
| Zakres tokena | Minimalny: tylko `read:org` |
| Organizacja | Sprawdzana przez GitHub API |
| Prywatność | Token nigdy nie opuszcza przeglądarki użytkownika |

**Uwaga:** Każdy użytkownik tworzy własny token, który jest przechowywany tylko w jego przeglądarce. Token nie jest współdzielony ani przesyłany do żadnego serwera poza GitHub API.

---

## Uruchomienie lokalne

Jeśli chcesz uruchomić aplikację lokalnie (do developmentu lub testów):

### Wymagania:
- Node.js 20 lub nowszy
- npm

### Instalacja i uruchomienie:

```bash
# Przejdź do folderu projektu
cd sprint-review

# Zainstaluj zależności
npm install

# Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem: `http://localhost:5173`

### Build produkcyjny:

```bash
npm run build
```

Wynik buildu znajdziesz w folderze `dist/`.

---

## Format opisu sprintu w Jira

Aby aplikacja poprawnie rozpoznawała cele i osiągnięcia, opis sprintu w Jira powinien być w następującym formacie:

```
## Cele główne
1. [Klient A] Implementacja zarządcy nagrzewnicy
2. [Klient B] Panel administracyjny
3. Optymalizacja wydajności (bez klienta)

## Osiągnięcia dodatkowe
- [Klient A] Zmiana logo
- [Klient C] Hotfix logowania
- Aktualizacja dokumentacji

## Plany na następny sprint
- Integracja z API płatności
- Testy E2E
```

### Etykiety zadań w Jira:

Aby zadania były przypisane do celów, dodaj etykiety:

- `cel1` - zadanie należy do celu 1
- `cel2` - zadanie należy do celu 2
- `cel1`, `cel2` - zadanie wpływa na oba cele

Zadania bez etykiet `cel*` pojawią się w sekcji "Wszystkie zadania".

---

## Używanie aplikacji

### Nawigacja:

- **Sidebar (lewa strona)** - lista sprintów, możliwość zwijania
- **Zakładki** - Przegląd, Wszystkie zadania, Statystyki, Następny sprint

### Tryb prezentacji:

1. Kliknij **"Tryb prezentacji"** w sidebarze
2. Nawigacja:
   - `←` / `→` lub `Space` - zmiana slajdu
   - `F` - pełny ekran
   - `Esc` - wyjście

### Dodawanie komentarzy:

1. Zaloguj się przez GitHub (wymagane)
2. Skonfiguruj Gist (przycisk "Gist" w nagłówku)
3. Kliknij na cel w przeglądzie
4. Przewiń do sekcji "Komentarze"
5. Wpisz treść komentarza
6. Kliknij "Dodaj komentarz"

Komentarze są automatycznie zapisywane do GitHub Gist (nie są tworzone commity w repozytorium).

### Synchronizacja z Jira:

1. Zaloguj się przez GitHub (wymagane)
2. Kliknij przycisk **"Synchronizuj z Jira"** w nagłówku
3. Poczekaj na zakończenie workflow GitHub Actions
4. Dane zostaną zaktualizowane automatycznie

### Zamykanie sprintu:

1. Zaloguj się przez GitHub (wymagane)
2. Skonfiguruj Gist (przycisk "Gist" w nagłówku)
3. Przejdź do aktywnego sprintu
4. Kliknij przycisk **"Zamknij sprint"**
5. Opcjonalnie zaznacz "Utwórz nowy sprint"
6. Potwierdź zamknięcie

### Eksport do PDF:

1. Kliknij przycisk **"Eksport PDF"** w prawym górnym rogu
2. PDF zostanie automatycznie pobrany

### Filtrowanie po kliencie:

1. Kliknij dropdown **"Wszyscy klienci"**
2. Wybierz klienta z listy
3. Widok zostanie przefiltrowany

---

## Struktura projektu

```
sprint-review/
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions workflow
├── package.json               # Konfiguracja npm
├── vite.config.js             # Konfiguracja Vite
├── tailwind.config.js         # Konfiguracja Tailwind CSS
├── index.html                 # Główny plik HTML
│
├── data/                      # Dane JSON
│   ├── config.json            # Konfiguracja (OAuth, GitHub, Jira)
│   ├── current-sprint.json    # Aktualny sprint
│   └── sprints/
│       └── sprint-*.json      # Dane sprintów
│
├── scripts/                   # Skrypty synchronizacji
│   ├── sync_jira.py           # Synchronizacja z Jira
│   ├── requirements.txt       # Zależności Python
│   └── utils/
│       └── jira_parser.py     # Parser opisu sprintu
│
├── src/                       # Kod źródłowy Vue.js
│   ├── main.js                # Entry point
│   ├── App.vue                # Główny komponent
│   ├── router/                # Routing
│   ├── stores/                # Pinia stores
│   │   └── authStore.js       # Stan autoryzacji
│   ├── components/            # Komponenty UI
│   │   ├── LoginScreen.vue    # Ekran logowania
│   │   ├── UserMenu.vue       # Menu użytkownika
│   │   ├── JiraSyncButton.vue # Przycisk synchronizacji z Jira
│   │   ├── CloseSprintButton.vue # Przycisk zamykania sprintu
│   │   ├── GistTokenConfig.vue # Konfiguracja tokena Gist
│   │   └── ...                # Pozostałe komponenty
│   ├── views/                 # Widoki stron
│   ├── services/              # Serwisy (API)
│   │   ├── authService.js     # GitHub PAT authentication
│   │   ├── githubApi.js       # Walidacja tokenów GitHub
│   │   ├── gistService.js     # Operacje na GitHub Gist
│   │   ├── sprintManagementService.js # Zarządzanie sprintami
│   │   ├── githubActionsService.js # Wyzwalanie GitHub Actions
│   │   └── dataLoader.js      # Ładowanie danych (Gist + fallback)
│   └── assets/                # Style CSS
│
└── public/                    # Pliki statyczne
    └── favicon.svg
```

---

## Przechowywanie danych (GitHub Gist)

Aplikacja przechowuje dane sprintów i komentarze w GitHub Gist zamiast commitowania bezpośrednio do repozytorium. Dzięki temu:
- Komentarze są zapisywane natychmiastowo bez tworzenia commitów
- Dane są dostępne z dowolnego miejsca
- Historia zmian jest zarządzana przez Gist

### Struktura plików w Gist

```
Gist/
├── current-sprint.json     # Wskaźnik na aktywny sprint
├── sprint-41.json          # Dane sprintu 41
├── sprint-42.json          # Dane sprintu 42
└── ...                     # Kolejne sprinty
```

### Jak utworzyć Gist

1. Przejdź do [gist.github.com](https://gist.github.com)
2. Utwórz nowy Gist (publiczny lub prywatny)
3. Dodaj plik `current-sprint.json` z zawartością:
   ```json
   {
     "currentSprintId": 42,
     "isActive": true
   }
   ```
4. Skopiuj ID Gista z URL (ciąg znaków po nazwie użytkownika)
5. Utwórz Personal Access Token z uprawnieniem `gist`

### Konfiguracja Gist w aplikacji

Po zalogowaniu do aplikacji:
1. Kliknij przycisk **"Gist"** w nagłówku strony
2. Wprowadź ID Gista i token
3. Kliknij **"Zapisz"** - token zostanie zwalidowany

Token jest przechowywany w localStorage przeglądarki.

---

## Rozwiązywanie problemów

### Workflow nie działa / błąd synchronizacji:

1. Sprawdź czy Secrets są poprawnie ustawione w Settings → Secrets
2. Sprawdź logi w zakładce **Actions** → kliknij na workflow → wybierz job
3. Upewnij się, że token Jira jest aktualny
4. Sprawdź czy Board ID i Project Key są poprawne

### Strona nie ładuje się:

1. Sprawdź czy workflow `deploy` zakończył się sukcesem
2. Upewnij się, że GitHub Pages jest włączone (Settings → Pages → Source: GitHub Actions)
3. Poczekaj kilka minut po pierwszym deploy
4. Sprawdź URL w **Settings** → **Pages**

### Dane nie aktualizują się:

1. Uruchom ręcznie workflow w zakładce Actions
2. Workflow uruchamia się automatycznie codziennie o 6:00 UTC
3. Sprawdź logi joba `sync-jira`

### Błąd "401 Unauthorized" w Jira:

1. Sprawdź czy token API jest poprawny
2. Sprawdź czy email jest poprawny
3. Dla Jira Cloud - upewnij się, że używasz tokena API (nie hasła)

### Komentarze nie zapisują się do GitHub:

1. Upewnij się, że jesteś zalogowany przez GitHub
2. Sprawdź czy masz uprawnienia do zapisu w repozytorium
3. Sprawdź konsolę przeglądarki (F12) pod kątem błędów
4. Upewnij się, że `owner` i `repo` w `data/config.json` są poprawne

### Problemy z logowaniem GitHub:

1. **"Musisz należeć do organizacji..."** - Twoje konto GitHub nie jest członkiem organizacji określonej w `config.json`
2. **"Nieprawidłowy token"** - Sprawdź czy token jest poprawnie skopiowany i nie wygasł
3. **"Nie udało się sprawdzić członkostwa"** - Upewnij się, że token ma uprawnienie `read:org`
4. **Token wygasł** - Utwórz nowy token na GitHub i zaloguj się ponownie

### Problemy z Gist:

1. **"Gist nie jest skonfigurowany"** - Kliknij przycisk "Gist" w nagłówku i wprowadź ID Gista oraz token
2. **"Nieprawidłowy token lub ID Gista"** - Sprawdź czy ID Gista i token są poprawne
3. **Komentarze nie zapisują się** - Upewnij się, że token ma uprawnienie `gist`
4. **Dane nie ładują się z Gist** - Sprawdź czy pliki w Gist mają poprawny format JSON

### Problemy z synchronizacją Jira:

1. **Workflow nie uruchamia się** - Sprawdź czy masz uprawnienia do uruchamiania workflow w repozytorium
2. **Błąd synchronizacji** - Sprawdź logi w zakładce Actions na GitHub
3. **Dane nie aktualizują się** - Upewnij się, że secrets `GIST_ID` i `GIST_TOKEN` są ustawione w repozytorium

---

## Technologie

| Komponent | Technologia |
|-----------|-------------|
| Frontend | Vue.js 3 + Vite |
| State Management | Pinia |
| Styling | Tailwind CSS |
| Routing | Vue Router 4 |
| Auth | GitHub Personal Access Token |
| Markdown | marked |
| PDF | html2pdf.js |
| Sync | Python + requests |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |

---

## Licencja

MIT

---

*Projekt utworzony z pomocą Claude Code*
