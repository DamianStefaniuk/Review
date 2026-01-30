# Sprint Review

Aplikacja do prezentacji i archiwizacji review sprintów. Integracja z Jira, eksport do PDF, tryb prezentacji.

## Szybki start (uruchomienie lokalne)

### Wymagania
- Node.js 20+
- npm

### Instalacja
```bash
npm install
npm run build
npm run dev
```

Aplikacja dostępna pod: `http://localhost:5173`

## Wdrożenie na GitHub Pages

1. **Utwórz repozytorium** na GitHub
2. **Włącz GitHub Pages**: Settings → Pages → Source: GitHub Actions
3. **Skonfiguruj secrets** (Settings → Secrets → Actions) - zobacz sekcję poniżej
4. **Push kodu** do brancha `main`

### Konfiguracja secrets

| Secret | Wartość | Skąd wziąć |
|--------|---------|------------|
| `JIRA_URL` | `https://firma.atlassian.net` | Adres Twojej instancji Jira (widoczny w pasku przeglądarki) |
| `JIRA_EMAIL` | `jan.kowalski@firma.com` | Email konta używanego do logowania w Jira |
| `JIRA_API_TOKEN` | `ATATT3x...` | Wygeneruj na [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `DATA_REPO_OWNER` | `plumspzoo` | Nazwa organizacji GitHub będącej właścicielem repozytoriów danych |
| `DATA_REPO_TOKEN` | `ghp_xxxx...` | Token GitHub z uprawnieniem `repo` - [github.com/settings/tokens/new](https://github.com/settings/tokens/new) |

### Tworzenie tokena Jira API

1. Zaloguj się na [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Kliknij **"Create API token"**
3. Podaj nazwę (np. `sprint-review-sync`)
4. Skopiuj token - nie będzie można go ponownie wyświetlić

### Tworzenie tokena GitHub (DATA_REPO_TOKEN)

1. Otwórz [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Zaznacz uprawnienie **`repo`** (pełny dostęp do prywatnych repozytoriów)
3. Wygeneruj i skopiuj token

## Dodawanie nowej tablicy projektu

### Krok 1: Utwórz repozytorium danych
Utwórz prywatne repozytorium (np. `Review-Data-NazwaProjektu`) z strukturą:
```
Review-Data-NazwaProjektu/
├── current-sprint.json
├── sprints/
└── media/
```

Plik `current-sprint.json`:
```json
{
  "currentSprintId": 12345,
  "isActive": true
}
```

### Krok 2: Dodaj konfigurację do `data/config.json`
```json
{
  "repositories": [
    {
      "id": "nazwa-projektu",
      "name": "Nazwa wyświetlana",
      "dataRepo": {
        "owner": "organizacja",
        "repo": "Review-Data-NazwaProjektu",
        "dataPath": "sprints"
      },
      "jira": {
        "boardName": "KLUCZ_PROJEKTU"
      }
    }
  ]
}
```

### Krok 3: Dodaj secrets w GitHub Actions
- `JIRA_PROJECT_KEY_NAZWAPROJEKTU` - klucz projektu w Jira
- `JIRA_BOARD_ID_NAZWAPROJEKTU` - ID tablicy w Jira

### Jak znaleźć Project Key i Board ID w Jira

**Project Key** - widoczny w URL zadania i przy każdym numerze zadania:
```
https://firma.atlassian.net/browse/CVNT-123
                                   ^^^^
                                   Project Key
```

**Board ID** - widoczny w URL tablicy Scrum/Kanban:
```
https://firma.atlassian.net/jira/software/projects/CVNT/boards/142
                                                                ^^^
                                                                Board ID
```

Alternatywnie dla starszych wersji Jira:
```
https://firma.atlassian.net/secure/RapidBoard.jspa?rapidView=142
                                                             ^^^
                                                             Board ID
```

### Krok 4: Zaktualizuj workflow
W `.github/workflows/sync-jira-on-demand.yml` dodaj nową opcję w `repository_id`.

### Przykład: Dodanie tablicy VENT

**Dane wejściowe:**
- Nazwa zespołu: VENT
- Jira Project Key: `CVNT`
- Jira Board ID: `142`
- Organizacja: `plumspzoo`

**1. Repozytorium danych** - utwórz `Review-Data-Vent` z plikiem `current-sprint.json`:
```json
{
  "currentSprintId": 8663,
  "isActive": true
}
```

**2. Konfiguracja** - dodaj do `data/config.json`:
```json
{
  "id": "vent",
  "name": "Tablica VENT",
  "dataRepo": {
    "owner": "plumspzoo",
    "repo": "Review-Data-Vent",
    "dataPath": "sprints"
  },
  "jira": {
    "boardName": "VENT"
  }
}
```

**3. Secrets** - dodaj w Settings → Secrets → Actions:
- `JIRA_PROJECT_KEY_VENT` = `CVNT`
- `JIRA_BOARD_ID_VENT` = `142`

**4. Workflow** - w `sync-jira-on-demand.yml` dodaj opcję i mapowanie:
```yaml
inputs:
  repository_id:
    type: choice
    options:
      - vent  # <- dodaj tutaj
```

```yaml
- name: Set secrets based on repository
  run: |
    case "${{ inputs.repository_id }}" in
      vent)
        echo "JIRA_PROJECT_KEY=${{ secrets.JIRA_PROJECT_KEY_VENT }}" >> $GITHUB_ENV
        echo "JIRA_BOARD_ID=${{ secrets.JIRA_BOARD_ID_VENT }}" >> $GITHUB_ENV
        echo "DATA_REPO_NAME=Review-Data-Vent" >> $GITHUB_ENV
        ;;
    esac
```

## Autoryzacja (Personal Access Token)

### Wymagane uprawnienia tokena:
- **repo** - dostęp do repozytoriów danych
- **read:org** - weryfikacja członkostwa w organizacji
- **workflow** - uruchamianie synchronizacji Jira

### Tworzenie tokena:
1. Otwórz [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Zaznacz uprawnienia: `repo`, `read:org`, `workflow`
3. Wygeneruj i skopiuj token
4. Użyj tokena do zalogowania w aplikacji

**Uwaga:** Token przechowywany w sessionStorage - sesja wygasa po zamknięciu przeglądarki.

## Format opisu sprintu w Jira

Cele rozpoznawane automatycznie:
- **Numerowane** (1. 2. 3.) → cele główne
- **Z myślnikiem** (- ) → cele poboczne
- **[KLIENT]** w nawiasach kwadratowych → przypisanie do klienta

Etykiety zadań:
- `cel1`, `cel2` → przypisanie do celu głównego
- `extra1`, `extra2` → przypisanie do celu pobocznego

Można to też zmienić w pliku config.json

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|-------------|
| Brak dostępu | Sprawdź czy należysz do organizacji i masz token z `read:org` |
| Synchronizacja nie działa | Sprawdź secrets i logi w zakładce Actions |
| Dane nie ładują się | Sprawdź strukturę plików w repozytorium danych |

## Zgłaszanie problemów (Issues)

Jeśli znajdziesz błąd lub masz propozycję nowej funkcji, utwórz issue na GitHub:

### Jak utworzyć issue

1. Przejdź do zakładki **Issues** w repozytorium
2. Kliknij przycisk **New issue**
3. Wypełnij formularz:
   - **Tytuł** - krótki, opisowy tytuł problemu
   - **Opis** - szczegółowy opis zawierający:
     - Co próbowałeś zrobić
     - Co się stało (błąd, nieoczekiwane zachowanie)
     - Co powinno się stać
     - Kroki do odtworzenia problemu
     - Zrzuty ekranu (jeśli dotyczy)

### Przykład dobrego zgłoszenia błędu

```markdown
**Opis problemu**
Eksport PDF nie generuje poprawnie list punktowanych w komentarzach.

**Kroki do odtworzenia**
1. Otwórz sprint z komentarzem zawierającym listę punktowaną
2. Kliknij "Eksportuj do PDF"
3. Otwórz wygenerowany PDF

**Oczekiwane zachowanie**
Lista powinna być wyświetlona z punktami (bullet points).

**Aktualne zachowanie**
Lista jest wyświetlona jako zwykły tekst bez punktów.

**Zrzuty ekranu**
[Załącz zrzut ekranu]

**Środowisko**
- Przeglądarka: Chrome 120
- System: Windows 11
```
