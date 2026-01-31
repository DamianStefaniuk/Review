# Ocena Ryzyka - Aplikacja Sprint Review

## 1. Podsumowanie wykonawcze

### Ogólna ocena ryzyka: **NISKIE**

Aplikacja Sprint Review została poddana analizie bezpieczeństwa uwzględniającej zarówno aspekty techniczne, jak i kontekst organizacyjny jej wdrożenia. Pomimo zidentyfikowanych zagrożeń technicznych, **ryzyko rezydualne jest niskie** dzięki:

- **Brak kodu źródłowego na GitHub** - cały kod firmy znajduje się na GitLab, GitHub zawiera tylko dane z Jira
- Kontroli dostępu przez organizację z wymogiem zatwierdzenia przez przełożonych
- Obowiązkowej dwuetapowej weryfikacji (2FA)
- Charakterowi przetwarzanych danych (informacje z Jira, nie kod ani sekrety)

**Najgorszy scenariusz przy wycieku tokena:** dostęp do danych review sprintów (informacje z Jira). Brak ryzyka wycieku kodu źródłowego.

### Kluczowe wnioski

1. **Niskie ryzyko** - aplikacja może być używana w obecnej formie bez obaw o wyciek kodu
2. **Brak kodu na GitHub** - nawet przy kompromitacji tokena, atakujący nie uzyska dostępu do kodu źródłowego firmy
3. **Ograniczony zakres szkód** - maksymalna szkoda to dostęp do informacji z Jira (dane review sprintów)
4. **Wielowarstwowa ochrona** - 2FA, kontrola dostępu przez przełożonych, weryfikacja członkostwa

---

## 2. Opis aplikacji i jej przeznaczenia

### Funkcjonalność

Aplikacja Sprint Review służy do:
- Prezentacji wyników sprintów w formie slajdów
- Generowania raportów PDF z przeglądu sprintu
- Zarządzania danymi review zespołów developerskich

### Architektura

| Komponent | Lokalizacja | Opis |
|-----------|-------------|------|
| Frontend | GitHub Pages | Aplikacja Vue.js hostowana statycznie |
| Dane | Prywatne repozytoria GitHub | Pliki JSON z danymi review sprintów |
| Uwierzytelnianie | GitHub API | Weryfikacja tokena PAT i członkostwa w organizacji |

**Kluczowa cecha architektury:** Aplikacja jest w pełni client-side - nie posiada własnego backendu, wszystkie operacje wykonywane są w przeglądarce użytkownika.

---

## 3. Kontekst bezpieczeństwa organizacyjnego

### Separacja środowisk

```
┌─────────────────────────────────────────────────────────────┐
│                    GITLAB (wewnętrzny)                      │
│    Kod źródłowy, projekty, pipeline CI/CD, sekrety          │
│    ═══════════════════════════════════════                  │
│    100% kodu firmy znajduje się tutaj                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    GITHUB (organizacja)                     │
│    Aplikacja Sprint Review + dane z Jira                    │
│    ─────────────────────────────────────────                │
│    BRAK KODU ŹRÓDŁOWEGO - tylko metadane sprintów           │
└─────────────────────────────────────────────────────────────┘
```

**Kluczowa implikacja bezpieczeństwa:** Na GitHub nie znajduje się żaden kod źródłowy firmy. Cały kod produkcyjny jest przechowywany wyłącznie na GitLab. W przypadku kompromitacji tokena GitHub (nawet z uprawnieniem `repo`), atakujący:
- ❌ NIE uzyska dostępu do kodu źródłowego (bo go tam nie ma)
- ❌ NIE uzyska dostępu do infrastruktury ani sekretów produkcyjnych
- ⚠️ Może uzyskać dostęp jedynie do danych review sprintów (informacje z Jira)

### Kontrola dostępu przez organizację

| Środek kontroli | Opis |
|-----------------|------|
| Zatwierdzanie członkostwa | Dostęp do organizacji GitHub wymaga akceptacji przełożonego |
| Token PAT | Wymagany token z uprawnieniami ograniczonymi do organizacji |
| Weryfikacja członkostwa | Aplikacja sprawdza przynależność do organizacji przez GitHub API |

### Wymóg 2FA

Organizacja wymusza dwuetapowe uwierzytelnianie (2FA) dla wszystkich członków, co:
- Chroni przed przejęciem konta przez wykradzione hasło
- Znacząco podnosi barierę dla atakujących
- Jest zgodne z najlepszymi praktykami bezpieczeństwa

---

## 4. Analiza zagrożeń i środki mitygujące

### Macierz ryzyka

| Zagrożenie | Ryzyko techniczne | Środki mitygujące | Ryzyko rezydualne |
|------------|-------------------|-------------------|-------------------|
| **Token w sessionStorage** | WYSOKIE | Wygasa przy zamknięciu przeglądarki, 2FA organizacji, **brak kodu na GitHub** - max. wyciek danych z Jira | NISKIE |
| **v-html z DOMPurify** | ŚREDNIE | Sanityzacja DOMPurify, CSP, dane z zaufanego źródła (organizacja) | NISKIE |
| **CSP z unsafe-inline** | ŚREDNIE | Dodatkowe nagłówki bezpieczeństwa, ograniczony zakres aplikacji | NISKIE |
| **Client-side access control** | ŚREDNIE | Weryfikacja przez GitHub API, brak własnego backendu, dane niskiej wrażliwości | NISKIE |
| **html2pdf.js dependency** | NISKIE | Pinned versions, użycie tylko do eksportu, brak wykonywania zewnętrznego kodu | NISKIE |

### Szczegółowa analiza zagrożeń

#### Token w sessionStorage (Ryzyko rezydualne: NISKIE)

**Zagrożenie:** Personal Access Token przechowywany bez szyfrowania w sessionStorage może zostać wykradziony przez:
- Atak XSS
- Złośliwe rozszerzenie przeglądarki
- Fizyczny dostęp do komputera

**Środki mitygujące:**
- ✅ Token wygasa automatycznie przy zamknięciu przeglądarki
- ✅ 2FA wymagane przez organizację utrudnia utworzenie nowego tokena
- ✅ **Na GitHub nie ma kodu źródłowego** - nawet token z uprawnieniem `repo` nie daje dostępu do kodu (bo go tam nie ma)
- ✅ Maksymalna szkoda przy wycieku: dostęp do informacji z Jira (dane review sprintów)
- ✅ Sanityzacja HTML przez DOMPurify ogranicza ryzyko XSS

**Rekomendacja:** Użytkownicy powinni być świadomi, że nie należy używać aplikacji na niezaufanych komputerach.

#### v-html z DOMPurify (Ryzyko rezydualne: NISKIE)

**Zagrożenie:** Dyrektywa v-html jest inherentnie ryzykowna, nawet z sanityzacją.

**Środki mitygujące:**
- ✅ DOMPurify aktywnie sanityzuje HTML
- ✅ Dane pochodzą z prywatnych repozytoriów organizacji
- ✅ Tylko członkowie organizacji mogą modyfikować dane
- ✅ CSP ogranicza możliwości wykonania złośliwego kodu

#### CSP z unsafe-inline (Ryzyko rezydualne: NISKIE)

**Zagrożenie:** `unsafe-inline` w Content-Security-Policy zmniejsza skuteczność ochrony przed XSS.

**Środki mitygujące:**
- ✅ Wymagane przez framework Vue.js
- ✅ Inne dyrektywy CSP pozostają aktywne
- ✅ DOMPurify jako dodatkowa warstwa ochrony

#### Client-side access control (Ryzyko rezydualne: NISKIE)

**Zagrożenie:** Kontrola dostępu oparta wyłącznie na weryfikacji po stronie klienta.

**Środki mitygujące:**
- ✅ GitHub API wymusza uwierzytelnianie dla prywatnych repozytoriów
- ✅ Brak własnego backendu oznacza brak punktu ataku na serwer
- ✅ Dane review sprintów nie są krytyczne biznesowo

---

## 5. Klasyfikacja danych

### Dane przetwarzane przez aplikację

Aplikacja przetwarza wyłącznie **dane eksportowane z Jira** - informacje o sprintach i zadaniach. Na GitHub nie znajduje się żaden kod źródłowy firmy.

| Typ danych | Przykład | Klasyfikacja |
|------------|----------|--------------|
| Metadane sprintu (Jira) | Numer sprintu, daty, nazwa | Wewnętrzne |
| Podsumowania zadań (Jira) | Opis wykonanych prac, tytuły tasków | Wewnętrzne |
| Statystyki zespołu | Story points, velocity | Wewnętrzne |
| Token PAT | Token uwierzytelniający | Poufne |

### Ocena wrażliwości

**Dane niskiej wrażliwości** - aplikacja przetwarza jedynie informacje z Jira (metadane sprintów), które:
- ❌ Nie zawierają kodu źródłowego (kod jest wyłącznie na GitLab)
- ❌ Nie zawierają danych osobowych (poza imionami członków zespołu)
- ❌ Nie zawierają sekretów, kluczy API ani haseł
- ⚠️ Zawierają informacje o zadaniach i postępach prac (niska wartość dla atakującego)

**Wyjątek:** Token PAT jest daną poufną i wymaga odpowiedniej ochrony, którą zapewnia:
- Przechowywanie w sessionStorage (automatyczne usunięcie)
- Wymóg 2FA organizacji
- Ograniczone uprawnienia tokena

---

## 6. Rekomendacje

### Akceptacja ryzyka

Na podstawie przeprowadzonej analizy, **ryzyko korzystania z aplikacji Sprint Review jest niskie i akceptowalne** przy założeniu:

1. ✅ **Kod źródłowy firmy nie jest i nie będzie przechowywany na GitHub** (pozostaje na GitLab)
2. ✅ Organizacja GitHub wymaga 2FA
3. ✅ Dostęp do organizacji jest kontrolowany przez przełożonych
4. ✅ Użytkownicy są świadomi, że maksymalne ryzyko to wyciek danych z Jira

### Wytyczne dla użytkowników

| Zalecenie | Priorytet |
|-----------|-----------|
| Nie używać aplikacji na niezaufanych komputerach | Wysoki |
| Zamykać kartę/przeglądarkę po zakończeniu pracy | Średni |
| Nie udostępniać tokena PAT innym osobom | Wysoki |
| Zgłaszać podejrzane zachowania aplikacji | Średni |

### Opcjonalne ulepszenia (do rozważenia w przyszłości)

| Ulepszenie | Korzyść | Priorytet |
|------------|---------|-----------|
| Szyfrowanie tokena w sessionStorage | Utrudnienie ekstrakcji tokena | Niski |
| Implementacja OAuth flow zamiast PAT | Brak przechowywania tokena | Niski |
| Subresource Integrity dla CDN | Ochrona przed kompromitacją CDN | Niski |
| Nonce-based CSP | Eliminacja unsafe-inline | Niski |

**Uwaga:** Powyższe ulepszenia są opcjonalne i mają niski priorytet ze względu na akceptowalny poziom ryzyka rezydualnego oraz charakter przetwarzanych danych.

---

## Podsumowanie

Aplikacja Sprint Review, pomimo zidentyfikowanych zagrożeń technicznych, prezentuje **niski poziom ryzyka** w kontekście organizacyjnym jej wdrożenia. Kluczowe czynniki mitygujące to:

1. **Brak kodu na GitHub** - na GitHub nie ma kodu źródłowego firmy, nawet wyciek tokena z uprawnieniem `repo` nie daje dostępu do kodu (bo go tam nie ma)
2. **Ograniczony zakres szkód** - maksymalna szkoda to wyciek informacji z Jira (dane review sprintów)
3. **Kontrola organizacyjna** - wielopoziomowa weryfikacja dostępu z wymogiem 2FA
4. **Istniejące zabezpieczenia** - DOMPurify, CSP, weryfikacja członkostwa

Aplikacja może być używana zgodnie z przeznaczeniem przy zachowaniu podstawowych zasad higieny bezpieczeństwa przez użytkowników.

---

*Dokument utworzony: Styczeń 2026*
*Ostatnia aktualizacja: Styczeń 2026*
