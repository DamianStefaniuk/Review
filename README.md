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
- [Kolejka operacji i obsługa konfliktów](#kolejka-operacji-i-obsługa-konfliktów)
- [Upload mediów (zdjęcia, GIFy, video)](#upload-mediów-zdjęcia-gify-video)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Funkcjonalnosci

- **Przeglad sprintow** - wyswietlanie celow glownych z progress barami
- **Cele poboczne** - dodatkowe cele z Jira (elementy z myslnikiem) z wlasnymi progress barami
- **Osiagniecia dodatkowe** - edytowalny tekst Markdown do dokumentowania osiagniec
- **Szczegoly celow** - lista zadan, statusy, komentarze
- **Wszystkie zadania** - widok wszystkich zadan z sortowaniem i filtrowaniem
- **Filtrowanie po klientach** - grupowanie i filtrowanie po `[NAZWA_KLIENTA]`
- **Tryb prezentacji** - pelnoekranowy tryb do przeprowadzania review
- **Eksport do PDF** - generowanie PDF z aktualnego review
- **Autoryzacja GitHub PAT** - logowanie przez Personal Access Token z kontrola czlonkostwa w organizacji
- **Przechowywanie danych w prywatnym repozytorium** - komentarze i dane sprintow przechowywane w repozytorium Review-Data
- **Synchronizacja z Jira na zadanie** - przycisk wyzwalajacy GitHub Actions workflow
- **Zamykanie sprintu** - mozliwosc zamkniecia sprintu i utworzenia nowego z poziomu UI
- **Upload mediów** - możliwość dodawania zdjęć, GIFów i filmów do komentarzy, osiągnięć i planów na następny sprint

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
| `DATA_REPO_OWNER` | Wlasciciel repozytorium danych (np. `plumspzoo`) |
| `DATA_REPO_NAME` | Nazwa repozytorium danych (np. `Review-Data`) |
| `DATA_REPO_TOKEN` | Personal Access Token z uprawnieniem `repo` |

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
  "dataRepo": {
    "owner": "twoja-organizacja",
    "repo": "nazwa-repozytorium-danych",
    "dataPath": "sprints"
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
| `github.repo` | Nazwa repozytorium aplikacji |
| `github.branch` | Branch główny (zazwyczaj `main`) |
| `github.organization` | Nazwa organizacji do weryfikacji członkostwa |
| `dataRepo.owner` | Właściciel repozytorium danych (musi być taki sam jak w `DATA_REPO_OWNER`) |
| `dataRepo.repo` | Nazwa repozytorium danych (musi być taka sama jak w `DATA_REPO_NAME`) |
| `dataRepo.dataPath` | Ścieżka do folderu ze sprintami (domyślnie `sprints`) |

**WAŻNE:** Wartości `dataRepo.owner` i `dataRepo.repo` muszą być zgodne z secrets `DATA_REPO_OWNER` i `DATA_REPO_NAME` skonfigurowanymi w GitHub Actions. W przeciwnym razie synchronizacja Jira zapisze dane do innego repozytorium niż to, z którego aplikacja je odczytuje.

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
3. Tworzy token na GitHub z uprawnieniami read:org i workflow
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
   - **read:org** (w sekcji "admin:org") - wymagane do weryfikacji członkostwa
   - **workflow** (w sekcji "workflow") - wymagane do uruchamiania synchronizacji Jira
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

Token wymaga następujących uprawnień:

| Scope | Cel | Wymagane? |
|-------|-----|-----------|
| `read:org` | Sprawdzenie członkostwa w organizacji | Tak (do logowania) |
| `workflow` | Uruchamianie synchronizacji Jira z aplikacji | Tak (do synchronizacji) |

**Uwaga:** Bez uprawnienia `workflow` logowanie będzie działać, ale przycisk "Synchronizuj z Jira" zwróci błąd 403.

### Bezpieczeństwo

| Aspekt | Rozwiązanie |
|--------|-------------|
| Token storage | localStorage (przechowywany lokalnie w przeglądarce użytkownika) |
| Zakres tokena | `read:org` + `workflow` (minimalne wymagane uprawnienia) |
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

Aplikacja rozpoznaje **trzy kategorie celow**:

| Kategoria | Zrodlo | Tag w Jira | Edycja z UI |
|-----------|--------|------------|-------------|
| **Cele glowne** | Jira (numerowane 1., 2.) | `cel1`, `cel2` | Nie |
| **Cele poboczne** | Jira (z myslnikiem -) | `extra1`, `extra2` | Nie |
| **Osiagniecia dodatkowe** | Recznie z interfejsu | brak | Tak |

Parser obsluguje **dwa formaty** opisu sprintu:

### Format 1: Z naglowkami sekcji

```
## Cele glowne
1. [Klient A] Implementacja zarzadcy nagrzewnicy
2. [Klient B] Panel administracyjny
3. Optymalizacja wydajnosci (bez klienta)

## Cele poboczne
- [Klient A] Zmiana logo
- [Klient C] Hotfix logowania
- Aktualizacja dokumentacji
```

### Format 2: Automatyczne rozpoznawanie (bez naglowkow)

```
1. [KLIENT_NAZWA] Cel glowny 1
2. [KLIENT_NAZWA] Cel glowny 2
3. Cel glowny 3 (bez klienta/globalny)

- [KLIENT_NAZWA] Cel poboczny 1
- [KLIENT_NAZWA] Cel poboczny 2
- Cel poboczny bez klienta
```

W tym formacie:
- **Elementy numerowane** (1. 2. 3.) -> rozpoznawane jako **cele glowne**
- **Elementy z myslnikiem** (- ) -> rozpoznawane jako **cele poboczne**

### Etykiety zadan w Jira:

Aby zadania byly przypisane do celow, dodaj etykiety:

**Cele glowne:**
- `cel1` - zadanie nalezy do celu glownego 1
- `cel2` - zadanie nalezy do celu glownego 2

**Cele poboczne:**
- `extra1` - zadanie nalezy do celu pobocznego 1
- `extra2` - zadanie nalezy do celu pobocznego 2

Zadania bez etykiet `cel*` lub `extra*` pojawia sie w sekcji "Wszystkie zadania".

### Osiagniecia dodatkowe

Osiagniecia dodatkowe sa **edytowalne bezposrednio z aplikacji webowej**. Obsluguja format Markdown i sa zapisywane do repozytorium Review-Data. Mozna dodawac dowolne informacje o osiagniecach, ktore nie sa sledzone przez zadania w Jira.

**Uwaga:** Plany na nastepny sprint rowniez sa edytowalne bezposrednio z aplikacji webowej (zakladka "Nastepny sprint") i NIE sa pobierane z opisu sprintu w Jira.

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
2. Upewnij się, że masz dostęp do repozytorium Review-Data
3. Kliknij na cel w przeglądzie
4. Przewiń do sekcji "Komentarze"
5. Wpisz treść komentarza
6. Kliknij "Dodaj komentarz"

Komentarze są automatycznie zapisywane do repozytorium Review-Data.

### Synchronizacja z Jira:

1. Zaloguj się przez GitHub (wymagane)
2. Kliknij przycisk **"Synchronizuj z Jira"** w nagłówku
3. Poczekaj na zakończenie workflow GitHub Actions
4. Dane zostaną zaktualizowane automatycznie

### Zamykanie sprintu:

1. Zaloguj się przez GitHub (wymagane)
2. Upewnij się, że masz dostęp do repozytorium Review-Data
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
│   │   ├── DataRepoStatus.vue # Status polaczenia z repozytorium danych
│   │   ├── MediaUploader.vue  # Komponent uploadu mediów (drag&drop, paste, picker)
│   │   ├── CommentEditor.vue  # Edytor komentarzy z obsługą mediów
│   │   ├── AchievementsList.vue # Lista osiągnięć z obsługą mediów
│   │   ├── NextSprintPlans.vue # Plany na następny sprint z obsługą mediów
│   │   └── ...                # Pozostałe komponenty
│   ├── views/                 # Widoki stron
│   ├── services/              # Serwisy (API)
│   │   ├── authService.js     # GitHub PAT authentication
│   │   ├── githubApi.js       # Walidacja tokenów GitHub
│   │   ├── repoDataService.js # Operacje na repozytorium danych (niski poziom)
│   │   ├── operationQueueService.js # Kolejka operacji z retry (SHA conflicts)
│   │   ├── githubActionsService.js # Wyzwalanie GitHub Actions
│   │   ├── mediaService.js    # Upload i pobieranie mediów z GitHub
│   │   └── dataLoader.js      # Ładowanie danych (Repository + fallback)
│   ├── composables/           # Vue composables
│   │   └── useOperationQueue.js # Composable do kolejki operacji (w tym queueMediaUpload)
│   ├── utils/                 # Narzędzia pomocnicze
│   │   ├── pluralize.ts       # Odmiana polskich rzeczowników
│   │   └── markdownMedia.js   # Renderowanie Markdown z obsługą mediów
│   └── assets/                # Style CSS
│
└── public/                    # Pliki statyczne
    └── favicon.svg
```

---

## Przechowywanie danych (prywatne repozytorium Review-Data)

Aplikacja przechowuje dane sprintów i komentarze w prywatnym repozytorium GitHub (`plumspzoo/Review-Data`). Dzięki temu:
- **Bezpieczeństwo** - dane są dostępne tylko dla członków organizacji
- **Kontrola dostępu** - wykorzystanie tokena PAT użytkownika (nie globalnego tokena w kodzie)
- **Historia zmian** - pełna historia wersji przez Git

### Dwa rodzaje tokenów

Aplikacja wykorzystuje **dwa różne tokeny** do różnych celów:

| Token | Gdzie używany | Kto tworzy | Cel |
|-------|---------------|------------|-----|
| **Token użytkownika (logowanie)** | Frontend (przeglądarka) | Każdy użytkownik | Odczyt/zapis danych przez UI |
| **DATA_REPO_TOKEN (secret)** | GitHub Actions | Administrator | Automatyczna synchronizacja Jira |

**Dlaczego dwa tokeny?**
- **Token użytkownika** - każdy członek organizacji loguje się własnym PAT. Dzięki temu wiadomo kto dokonał zmian, a token nigdy nie jest widoczny w kodzie źródłowym.
- **DATA_REPO_TOKEN** - workflow GitHub Actions działa bez kontekstu zalogowanego użytkownika, więc potrzebuje własnego tokena do zapisu danych z Jira.

### Struktura plików w repozytorium Review-Data

```
Review-Data/
├── current-sprint.json     # W KATALOGU GŁÓWNYM (root) - wskaźnik na aktywny sprint
├── sprints/                # Podkatalog na pliki sprintów
│   ├── sprint-8663.json    # Dane sprintu 8663
│   ├── sprint-8664.json    # Dane sprintu 8664
│   └── ...                 # Kolejne sprinty
└── media/                  # Podkatalog na pliki mediów
    └── sprint-{id}/        # Media pogrupowane według sprintu
        ├── 1706012345678-abc123.png
        ├── 1706012345999-def456.gif
        └── 1706012346123-ghi789.mp4
```

**Ważne:**
- `current-sprint.json` musi być w **katalogu głównym** (root), NIE w `sprints/`
- Pliki sprintów (`sprint-XXXX.json`) muszą być w podkatalogu `sprints/`
- Nazwa pliku to `current-sprint.json` (z myślnikiem `-`, nie podkreśleniem `_`)

### Krok 1: Utworzenie repozytorium Review-Data

1. Zaloguj się do GitHub jako członek organizacji `plumspzoo`
2. Utwórz nowe **prywatne** repozytorium o nazwie `Review-Data` w organizacji
3. Utwórz plik `current-sprint.json` **w katalogu głównym** (root):
   ```json
   {
     "currentSprintId": 8663,
     "isActive": true
   }
   ```
   Zamień `8663` na ID aktualnego sprintu w Jira.

4. Utwórz katalog `sprints/` (może być pusty - sync z Jira utworzy pliki sprintów)

**Opcjonalnie** możesz od razu utworzyć plik sprintu `sprints/sprint-8663.json`:
```json
{
  "id": 8663,
  "name": "Sprint 8663",
  "status": "active",
  "goals": [],
  "sideGoals": [],
  "tasks": [],
  "achievements": "",
  "nextSprintPlans": ""
}
```
Jednak nie jest to konieczne - synchronizacja z Jira automatycznie utworzy i wypełni ten plik.

### Krok 2: Konfiguracja DATA_REPO_TOKEN (dla GitHub Actions)

Ten token jest potrzebny **tylko dla automatycznej synchronizacji Jira**. Można go utworzyć raz i dodać do secrets.

1. Zaloguj się na GitHub jako członek organizacji z uprawnieniami write do Review-Data
2. Przejdź do [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
3. Utwórz token z uprawnieniem **`repo`** (pełny dostęp do prywatnych repozytoriów)
4. W repozytorium **Review** dodaj secrets (**Settings** → **Secrets and variables** → **Actions**):
   - `DATA_REPO_OWNER` = `plumspzoo`
   - `DATA_REPO_NAME` = `Review-Data`
   - `DATA_REPO_TOKEN` = skopiowany token

**Uwaga:** Token jest tworzony przez użytkownika indywidualnego (nie organizację). GitHub PAT zawsze należy do konkretnego konta użytkownika. Można też utworzyć dedykowane konto "bot" w organizacji dla tego celu.

### Krok 3: Token użytkownika (dla logowania w UI)

Każdy użytkownik aplikacji musi utworzyć własny PAT do logowania:

1. Przejdź do [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Utwórz token z uprawnieniami:
   - **`repo`** - dostęp do Review-Data
   - **`read:org`** - weryfikacja członkostwa w organizacji
   - **`workflow`** - uruchamianie synchronizacji Jira (opcjonalne)
3. Użyj tego tokena do zalogowania się w aplikacji

### Podsumowanie wymaganych uprawnień

**Dla użytkowników (logowanie w UI):**

| Scope | Cel | Wymagane? |
|-------|-----|-----------|
| `repo` | Odczyt/zapis danych w Review-Data | Tak |
| `read:org` | Sprawdzenie członkostwa w organizacji | Tak |
| `workflow` | Uruchamianie synchronizacji Jira z UI | Opcjonalne |

**Dla DATA_REPO_TOKEN (GitHub Actions):**

| Scope | Cel | Wymagane? |
|-------|-----|-----------|
| `repo` | Zapis danych z Jira do Review-Data | Tak |

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

### Problemy z repozytorium danych:

1. **"Nie jesteś zalogowany"** - Zaloguj się używając Personal Access Token z uprawnieniem `repo`
2. **Komentarze nie zapisują się** - Upewnij się, że token ma uprawnienie `repo` i masz dostęp do repozytorium Review-Data
3. **Dane nie ładują się** - Sprawdź czy pliki w repozytorium mają poprawny format JSON
4. **Dane widoczne tylko po zalogowaniu** - To prawidłowe zachowanie - dane są dostępne tylko dla zalogowanych członków organizacji

### Problemy z synchronizacją Jira:

1. **Workflow nie uruchamia się** - Sprawdź czy masz uprawnienia do uruchamiania workflow w repozytorium
2. **Błąd synchronizacji** - Sprawdź logi w zakładce Actions na GitHub
3. **Dane nie aktualizują się** - Upewnij się, że secrets `DATA_REPO_OWNER`, `DATA_REPO_NAME` i `DATA_REPO_TOKEN` są ustawione w repozytorium

---

## Kolejka operacji i obsługa konfliktów

Aplikacja używa systemu kolejki operacji do bezpiecznej obsługi równoległych zmian danych. Jest to ważne, ponieważ:

1. **Jeden użytkownik** może wykonać wiele operacji szybko (np. dodać kilka komentarzy)
2. **Wielu użytkowników** może edytować dane jednocześnie

### Jak to działa

```
┌─────────────────────────────────────────┐
│ Komponenty Vue (GoalDetail, etc.)       │
└────────────────┬────────────────────────┘
                 │ używają
┌────────────────▼────────────────────────┐
│ useOperationQueue.js (composable)       │
│ - queueAddComment()                     │
│ - queueSaveAchievements()               │
│ - queueCloseSprint()                    │
└────────────────┬────────────────────────┘
                 │ wywołuje
┌────────────────▼────────────────────────┐
│ operationQueueService.js                │
│ - Kolejka FIFO (serializacja operacji)  │
│ - Retry z exponential backoff (7 prób)  │
│ - Deduplikacja operacji                 │
└────────────────┬────────────────────────┘
                 │ wywołuje
┌────────────────▼────────────────────────┐
│ repoDataService.js (GitHub API)         │
└─────────────────────────────────────────┘
```

### Operacje objęte kolejką

| Operacja | Retry | Priorytet | Timeout |
|----------|-------|-----------|---------|
| Dodawanie komentarzy | 7 prób | Normalny | 30s |
| Edycja komentarzy | 7 prób | Normalny | 30s |
| Usuwanie komentarzy | 7 prób | Normalny | 30s |
| Zapis osiągnięć | 7 prób | Normalny | 30s |
| Zapis planów następnego sprintu | 7 prób | Normalny | 30s |
| Upload mediów | 7 prób | Normalny | 120s |
| Zamknięcie sprintu | 7 prób | Krytyczny | 60s |

### Komunikaty dla użytkownika

- **Podczas retry**: "Konflikt danych, ponawiam (2/7)..."
- **Po wyczerpaniu prób**: "Nie udało się zapisać po wielu próbach. Odśwież stronę."

---

## Upload mediów (zdjęcia, GIFy, video)

Aplikacja umożliwia dodawanie mediów (zdjęć, GIFów, filmów) do sekcji Markdown:
- **Komentarze** w celach głównych i pobocznych
- **Osiągnięcia dodatkowe**
- **Plany na następny sprint**

### Obsługiwane formaty

| Typ | Formaty | Maksymalny rozmiar |
|-----|---------|-------------------|
| Obrazy | JPG, PNG, GIF, WebP | 10 MB |
| Video | MP4, WebM | 50 MB |

### Sposoby dodawania mediów

1. **Drag & drop** - przeciągnij plik na obszar uploadu
2. **Wklejanie (Ctrl+V)** - wklej obraz ze schowka
3. **Wybór pliku** - kliknij w obszar uploadu i wybierz plik

### Jak dodać media

1. **Zaloguj się** przez GitHub (wymagane)
2. **Wejdź w tryb edycji** (komentarz, osiągnięcia lub plany)
3. **Kliknij przycisk "Media"** lub "Dodaj media"
4. **Wybierz plik** jedną z powyższych metod
5. **Podgląd** - sprawdź podgląd przed wysłaniem
6. **Kliknij "Wyślij"** - plik zostanie przesłany do GitHub
7. **Markdown automatycznie wstawiony** - składnia obrazu/video zostanie dodana do tekstu

### Przechowywanie mediów

Media są przechowywane w repozytorium GitHub w strukturze:

```
Review-Data/
├── sprints/
│   └── sprint-{id}.json
└── media/
    └── sprint-{id}/
        ├── 1706012345678-abc123.png
        ├── 1706012345999-def456.gif
        └── 1706012346123-ghi789.mp4
```

### Składnia Markdown dla mediów

```markdown
<!-- Obrazy -->
![opis](media/sprint-8663/1706012345678-abc123.png)

<!-- GIFy (tak samo jak obrazy) -->
![animacja](media/sprint-8663/1706012345999-def456.gif)

<!-- Video -->
![video](media/sprint-8663/1706012346123-ghi789.mp4)
```

### Wyświetlanie mediów

- Media są **automatycznie ładowane** przy wyświetlaniu treści Markdown
- Wymagane jest **zalogowanie** do przeglądania mediów (pobierane przez GitHub API z tokenem użytkownika)
- Media są **cachowane** w przeglądarce dla lepszej wydajności
- **Responsywne wyświetlanie** - obrazy i video dostosowują się do szerokości kontenera

### Ograniczenia

- Media są dostępne **tylko dla zalogowanych użytkowników** (wymóg autoryzacji GitHub API)
- Brak **galerii mediów** - media są wstawiane bezpośrednio do treści Markdown
- Brak **automatycznej kompresji** - pliki są przesyłane w oryginalnej jakości
- Timeout uploadu: **120 sekund** dla dużych plików

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
