# SIŁKA3 — Dokumentacja techniczna dla zewnętrznego IT

**Wersja dokumentu:** 1.0
**Wersja aplikacji:** vGPT_1.0.0
**Data:** maj 2026
**Adresat:** zespół IT przejmujący serwis aplikacji bez wcześniejszej znajomości kodu

---

## 1. Wprowadzenie i cel aplikacji

### 1.1. Krótki opis

SIŁKA3 to aplikacja webowa (Progressive Web App) służąca do prowadzenia treningów siłowych na siłowni. Użytkownik definiuje listę ćwiczeń, w trakcie treningu odhacza kolejne serie, między seriami aplikacja odlicza przerwę, a po zakończeniu treningu zapisuje czas trwania i datę do lokalnej historii. Historia może być eksportowana do arkusza Google Sheets.

### 1.2. Profil docelowego użytkownika

Aplikacja jest budowana pod konkretnego użytkownika końcowego:

- Język interfejsu: **polski** (wszystkie etykiety, komunikaty, nazwy)
- Główne urządzenie testowe: **Pixel 8 Pro** (Android, Chrome). Aplikacja jest też używana z poziomu zwykłej przeglądarki na komputerze.
- Sposób korzystania: jako **zainstalowana PWA** na ekranie głównym telefonu, używana w warunkach siłowni (tryb offline również obsługiwany).
- Pojedynczy użytkownik — brak kont, logowania, multiużytkownika.

### 1.3. Lista głównych funkcji

- Lista ćwiczeń z parametrami (serie, powtórzenia, waga, długość przerwy)
- Prowadzenie treningu seria po serii z licznikiem upływającego czasu
- Odliczanie przerwy między seriami (domyślnie 60 s, indywidualnie dla każdego ćwiczenia)
- Wibracja po zakończeniu przerwy + miganie zielonego ekranu
- Tryb czuwania (czarny ekran) gdy telefon leży obok podczas przerwy
- Edycja ćwiczeń w trakcie treningu (parametry, kolejność, ukrywanie)
- Historia treningów z datami, czasem trwania, dniami przerwy między treningami
- Średnie statystyki (3M = średnia z 3 miesięcy, BR = bieżący rok)
- Cel czasowy (np. "trening co 3,5 dnia") z kolorystyką sygnalizacyjną
- Ekran pakowania ze zdjęciami akcesoriów do zabrania na siłownię
- Eksport historii do Google Sheets przez Apps Script (POST)
- Import historii z Google Sheets (GET)
- Edycja dat w historii (kalendarz)
- Reset trwającego treningu długim przytrzymaniem START

### 1.4. Czym aplikacja **nie jest**

- Nie ma własnego backendu (poza Google Apps Script jako bramą do Sheets)
- Nie ma kont użytkowników, logowania, autoryzacji
- Nie ma synchronizacji w czasie rzeczywistym między urządzeniami (jedyna ścieżka synchronizacji to ręczny eksport/import przez Sheets)
- Nie ma społeczności, znajomych, udostępniania
- Nie ma reklam, monetyzacji, telemetrii
- Nie ma testów automatycznych

### 1.5. Stan obecny i znane problemy

- Wersja: vGPT_1.0.0
- Graficzne odliczanie przerwy używa pełnoekranowej animacji ładowania baterii na czarnym tle. Plik `Photos/Bateria.png` jest używany przez overlay przerwy.
- Wibracja na Pixel 8 Pro bywa niespójna (Android agresywnie ogranicza wibracje aplikacjom w tle)
- Cache Service Workera bywa uciążliwy — czasem wymagane czyszczenie pamięci aplikacji lub reinstalacja PWA po zmianach
- W repo pozostały zdjęcia treningowe i ikony pakowania w katalogu `Photos/`

---

## 2. Architektura ogólna

### 2.1. Stack technologiczny

#### 2.1.1. Frontend

- **Vanilla JavaScript** — bez frameworka. Cała logika w jednym pliku `app.js`.
- **HTML** — pojedynczy `index.html` z wszystkimi ekranami (sekcje są pokazywane/ukrywane przez klasy CSS).
- **CSS** — pojedynczy `styles.css`, używa CSS variables, brak preprocesora.

Brak buildu, brak transpilacji, brak NPM po stronie produkcyjnej. Pliki są wgrywane do GitHub jak są.

#### 2.1.2. Storage

- **localStorage** przeglądarki — główne miejsce trzymania danych użytkownika
- **Google Sheets** — opcjonalny backup dla historii treningów

#### 2.1.3. Brak własnego backendu

Eksport do arkusza odbywa się przez **Google Apps Script Web App** napisaną przez właściciela aplikacji w jego prywatnym Google Account. Aplikacja wysyła POST z JSON, skrypt zapisuje wiersze do arkusza.

#### 2.1.4. Hosting

- **GitHub Pages** — repozytorium publiczne `BG-user-OK/SILKA3_vGPT`, branch `main`
- URL produkcji: `https://bg-user-ok.github.io/SILKA3_vGPT/`
- Cache CDN GitHub: 1–10 minut po commicie

### 2.2. PWA (Progressive Web App)

Aplikacja jest instalowalna na Androidzie i iOS.

#### 2.2.1. manifest.json

Definiuje:
- Nazwa: "SIŁKA 3"
- Tryb wyświetlania: `standalone` (bez paska adresu Chrome)
- Orientacja: `portrait`
- Ikony: 192×192, 512×512, 512×512 maskable
- Theme color: czarny

#### 2.2.2. Service Worker (sw.js)

- Strategia: **cache-first z stale-while-revalidate**
- Pre-cache w `install`: pliki HTML/CSS/JS/manifest/ikony + Google Fonts
- W `fetch`: jeśli jest w cache → zwraca cache, w tle pobiera świeżą wersję i aktualizuje cache
- W `activate`: czyści stare cache (po starym `CACHE_NAME`)

#### 2.2.3. Cykl życia SW

1. Pierwsza wizyta: SW się rejestruje, pobiera pliki, zapisuje do cache
2. Kolejna wizyta: SW serwuje z cache (szybko, działa offline)
3. Zmiana `CACHE_NAME` w `sw.js`: stary SW zostaje, nowy się instaluje, ale **stary nadal serwuje** dopóki użytkownik nie zamknie wszystkich kart/instancji aplikacji
4. Reaktywacja: nowy SW przejmuje kontrolę, czyści stare cache

### 2.3. Struktura katalogów i plików w repo

```
SILKA3_vGPT/
├── index.html                  # główna strona, wszystkie ekrany
├── styles.css                  # wszystkie style
├── app.js                      # cała logika
├── sw.js                       # Service Worker
├── manifest.json               # konfiguracja PWA
├── icon-192.png                # ikona PWA mała
├── icon-512.png                # ikona PWA duża
├── icon-maskable-512.png       # ikona dla Androida (z maską)
├── README.md                   # opis projektu
├── google-apps-script.gs       # kod backend (odniesienie, nie używany przez apkę)
└── Photos/                     # zdjęcia ćwiczeń, ikony pakowania
    ├── 1.jpg                   # zdjęcie ćwiczenia o id=1
    ├── 2.jpg
    ├── ... (do 15.jpg)
    ├── batki.png               # ikona przedmiotu pakowania "batki"
    ├── skarpetki.png
    ├── spodenki.png
    ├── koszulka.png
    ├── buty.png
    ├── klapki.png
    ├── 2ręczniki.png
    ├── poduszka.png
    ├── woda.png
    ├── isotonic.png
    ├── shake.png
    ├── fotokoniec.jpg          # zdjęcie wyświetlane po skończonym treningu
    └── Bateria.png             # grafika baterii dla overlayu przerwy
```

### 2.4. Mapa zależności

```
index.html
   ├── manifest.json
   ├── icon-*.png (referencje)
   ├── Google Fonts CSS (Rajdhani, Orbitron) — preconnect
   ├── styles.css?v=X.Y.Z
   └── app.js?v=X.Y.Z

app.js
   ├── DOM (wszystkie elementy z index.html po id)
   ├── localStorage (klucze STORAGE_KEY, LS_APPSCRIPT)
   ├── Web APIs: Vibration, Wake Lock, Service Worker
   └── fetch() do URL Apps Script (jeśli skonfigurowany)

sw.js
   ├── cache: index.html, styles.css, app.js, manifest, ikony, Google Fonts
   └── fetch handler dla wszystkich requestów GET
```

---

## 3. Pliki źródłowe — szczegółowy opis

### 3.1. index.html

Pojedynczy plik HTML z wszystkimi ekranami aplikacji. Ekrany są elementami `<section class="screen">` i są pokazywane/ukrywane przez dodawanie/usuwanie klasy `.active` (oraz atrybutu `hidden`).

#### 3.1.1. Struktura DOM

```
<body>
  <div id="app">
    <section id="screen-home" class="screen screen--home active">
       — START, historia treningów
    <section id="screen-pack" class="screen screen--pack">
       — pakowanie (siatka zdjęć)
    <section id="screen-list" class="screen screen--list">
       — lista ćwiczeń podczas treningu
    <section id="screen-exercise" class="screen screen--exercise">
       — wykonanie pojedynczego ćwiczenia + overlay przerwy
    <div id="modalEditExercise">  — modal edycji ćwiczenia
    <div id="modalDatePicker">    — modal wyboru daty (kalendarz)
    <div id="modalConfirm">       — modal potwierdzenia (Tak/Nie)
    <div id="toast">              — toast komunikat
  </div>
</body>
```

#### 3.1.2. Mapa atrybutów `id` — kluczowe elementy

| ID | Element | Rola |
|----|---------|------|
| `screen-home` | `<section>` | Ekran 0 — strona główna |
| `screen-pack` | `<section>` | Ekran pakowania |
| `screen-list` | `<section>` | Ekran 1 — lista ćwiczeń |
| `screen-exercise` | `<section>` | Ekran 2 — wykonanie |
| `btnStart` | `<button>` | START / WZNÓW na ekranie głównym |
| `btnPackCancel` / `btnPackAccept` | `<button>` | Anulowanie / akceptacja pakowania |
| `packGrid` | `<div>` | Kontener kafelków pakowania |
| `historyBody` | `<tbody>` | Wiersze tabeli historii (generowane w JS) |
| `btnEditHistory` | `<button>` | ✏️ — wejście w tryb edycji dat |
| `btnEditGoal` | `<button>` | ✏️ — edycja celu 3M |
| `btnImportSheets` | `<button>` | ⤓ — import z arkusza |
| `bagIndicator` | `<button>` | 🎒 — status pakowania |
| `versionTag` | `<span>` | Wyświetlana wersja (klik 3× → konfiguracja URL) |
| `setsDone` / `setsLeft` | liczniki na górze | Serie wykonane / pozostałe |
| `trainingClockList` / `trainingClockEx` | `<div>` | Zegarek całkowitego czasu treningu |
| `exerciseList` | `<ul>` | Lista ćwiczeń w treningu |
| `btnConfirmSet2` | `<button>` | Duży zielony ✓ — potwierdzenie serii |
| `restTimer2` | `<div>` | Mały licznik przerwy nad ✓ |
| `btnEditExercise` | `<button>` | ⚙ — edycja parametrów na żywo |
| `exerciseImage` | `<img>` | Obrazek bieżącego ćwiczenia |
| `restOverlay` | `<div>` | Czarny ekran odliczania przerwy |
| `restOverlaySec` | `<span>` | Duża cyfra sekundy w odliczaniu |
| `restDoneOverlay` | `<div>` | Zielony migający ekran po przerwie |
| `standbyTrigger` / `standbyOverlay` | `<div>` | Tryb czuwania (czarny ekran) |
| `celebration` / `celebrationPack` | `<div>` | Animacja rozbłysku (supernowa) |
| `formEditExercise` | `<form>` | Formularz edycji ćwiczenia |
| `fName`, `fSets`, `fReps`, `fWeight`, `fActive`, `fRestTimer`, `fRestSeconds` | inputy | Pola edycji |
| `calGrid` | `<div>` | Siatka dni w kalendarzu |
| `confirmTitle` / `confirmText` / `btnConfirmYes` | dialog | Modal potwierdzenia |
| `toast` | `<div>` | Komunikat na dole ekranu |

#### 3.1.3. Linkowanie zasobów

```html
<link rel="manifest" href="manifest.json" />
<link rel="icon" href="icon-192.png" />
<link rel="apple-touch-icon" href="icon-192.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@500;700;900&display=swap" />
<link rel="stylesheet" href="styles.css?v=vGPT_1.0.0" />
...
<script src="app.js?v=vGPT_1.0.0"></script>
```

#### 3.1.4. Cache-busting przez `?v=X.Y.Z`

Aby przy zmianie pliku CSS lub JS przeglądarka pobrała nową wersję, w `index.html` przy linkach do `styles.css` i `app.js` dodawany jest parametr `?v=vGPT_1.0.0`. **Przy każdej zmianie wersji aplikacji ten parametr trzeba zaktualizować w 2 miejscach w `index.html`**.

### 3.2. styles.css

#### 3.2.1. CSS variables

Główne zmienne kolorów (deklarowane w `:root`):

| Zmienna | Wartość | Zastosowanie |
|---------|---------|--------------|
| `--bg` | `#0a0a0a` | Główne tło |
| `--bg-2` | `#141414` | Tło modali, kart |
| `--bg-3` | `#1c1c1c` | Tło inputów |
| `--bg-4` | `#242424` | Hover/active |
| `--line` | `#2a2a2a` | Cienkie ramki |
| `--line-2` | `#3a3a3a` | Mocniejsze ramki |
| `--green` | `#22c55e` | Główny kolor akcentu (zielony) |
| `--green-glow` | `#39ff7c` | Świecący zielony (Orbitron) |
| `--green-dark` | `#0f5a2b` | Ciemny zielony (gradienty) |
| `--green-row-light` / `--green-row-dark` | — | Tło wierszy historii |
| `--red`, `--red-glow`, `--red-dark` | — | Kolory ostrzegawcze |
| `--yellow`, `--yellow-glow`, `--yellow-dark` | — | Kolor pośredni / today |
| `--orange`, `--orange-dark` | — | Kolor "na granicy" |
| `--text` | `#f3f4f6` | Tekst główny |
| `--text-dim`, `--text-dimmer`, `--text-faded` | — | Stopnie wyciszenia |
| `--radius`, `--radius-lg`, `--radius-xl` | 14/22/32px | Zaokrąglenia |
| `--safe-t`, `--safe-b` | env() | Safe area dla notch |

#### 3.2.2. Sekcje stylów (kolejność w pliku)

1. Reset (`*, *::before, *::after`)
2. `:root` — zmienne
3. `html, body, button, input` — bazowe
4. `[hidden]` — wymuszenie ukrycia
5. Layout: `#app`, `.screen`, `.screen.active`
6. Ekran startowy: `.home-top`, `.home-btn-mega`, `.history-table`, `.bag-indicator`
7. Ekran pakowania: `.pack-grid`, `.pack-item`
8. Górny panel: `.top-panel`, `.counters`, `.training-clock`, `.action-area`
9. Lista ćwiczeń: `.exercise-list`, `.exercise-item`, `.balls`
10. Wykonanie ćwiczenia: `.exercise-layout`, `.exercise-params`, `.exercise-image`, `.helper-images`
11. Przerwa: `.rest-overlay`, `.rest-overlay__seconds`, `.rest-done-overlay`
12. Animacja rozbłysku (supernowa): `.celebration`, `.celebration__core`, `.celebration__ring`
13. Czuwanie: `.standby-overlay`, `.standby-trigger`
14. Modale: `.modal`, `.modal__sheet`, `.field`, `.field-row`
15. Kalendarz: `.calendar`, `.calendar__day`
16. Toast: `.toast`
17. Install hint: `.install-hint`
18. Media queries

#### 3.2.3. Media queries

Trzy progi:
- `@media (max-height: 700px)` — niższe nagłówki, mniejsze ikony, mniejsze ćwiczenie-thumb
- `@media (max-width: 430px)` — pola formularza w 2 kolumnach zamiast 3
- `@media (max-width: 380px)` — mniejsze fonty w tabeli historii

#### 3.2.4. Animacje (`@keyframes`)

| Nazwa | Czas | Co robi |
|-------|------|---------|
| `restOverlayIn` | 200ms | Fade-in czarnego ekranu przerwy |
| `restDoneFlash` | 0.6s × 6 | Pulsujący zielony po przerwie |
| `novaFade` | 1.5s | Główne wyciemnienie supernowy |
| `novaCore` | 1.5s | Powiększenie i zanik środka supernowy |
| `novaRing` | 1.5s | Powiększenie i zanik pierścienia |
| `blackwaveCore` / `blackwaveRing` / `blackwaveFade` | 0.9s | Czarna fala maskująca |
| `sheetUp` | 220ms | Wjazd modala od dołu |
| `toastIn` | 220ms | Wjazd toasta od dołu |
| `fadeIn` | 600ms | Pojawianie się install-hint |

### 3.3. app.js

Plik jest podzielony na 14 numerowanych sekcji oznaczonych komentarzami `// 0. WERSJA APLIKACJI` itd. Pełna lista:

| Nr | Nazwa | Zakres linii (orientacyjnie) |
|----|-------|-------------------------------|
| 0 | WERSJA APLIKACJI | ok. 5–7 |
| 1 | STAŁE I NARZĘDZIA | ok. 25–86 |
| 2 | DANE STARTOWE (seed) | ok. 87–165 |
| 3 | STATE + PERSYSTENCJA | ok. 166–229 |
| 4 | FUNKCJE POMOCNICZE HISTORII | ok. 232–339 |
| 5 | RENDEROWANIE | ok. 341–820 |
| 6 | LOGIKA TRENINGU | ok. 821–1192 |
| 7 | EDYCJA ĆWICZENIA | ok. 1195–1252 |
| 8 | EDYCJA HISTORII | ok. 1255–1437 |
| 9 | EKSPORT / IMPORT GOOGLE SHEETS | ok. 1440–1545 |
| 10 | DIALOG POTWIERDZENIA + TOAST | ok. 1548–1572 |
| 11 | PODPINANIE ZDARZEŃ | ok. 1575–1916 |
| 12 | SERVICE WORKER + INSTALL PROMPT | ok. 1919–1949 |
| 13 | START | ok. 1952– |

#### 3.3.1. Globalne stałe (sekcja 0–1)

```javascript
const APP_VERSION = 'vGPT_1.0.0';
const PACK_ITEMS = [...];                  // lista przedmiotów pakowania
const STORAGE_KEY = 'silka3_state_v2';     // klucz localStorage
const LS_APPSCRIPT = 'silka3_appscript_url';// klucz dla URL Apps Script
const REST_SECONDS = 60;                    // domyślna przerwa
const STORAGE_VERSION = 2;                  // wersja schematu
const RESET_HOLD_MS = 2000;                 // czas trzymania START aby zresetować
const PL_MONTHS_SHORT, PL_MONTHS_FULL, PL_DOW;  // nazwy w PL
```

#### 3.3.2. Punkt wejścia

Na samym dole pliku (`// 13. START`) znajduje się kod uruchamiający aplikację:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  bindEventHandlers();
  renderHome();
  showScreen('screen-home');
  registerServiceWorker();
  ...
});
```

### 3.4. sw.js — Service Worker

**62 linie**. Implementuje 3 handlery:

```javascript
const CACHE_NAME = 'silka3-vGPT_1.0.0';
const CORE_ASSETS = ['./', './index.html', './styles.css',
                     './app.js', './manifest.json',
                     './icon-192.png', './icon-512.png',
                     './icon-maskable-512.png',
                     'https://fonts.googleapis.com/css2?...'];

self.addEventListener('install', e => { /* prekeszowanie */ self.skipWaiting(); });
self.addEventListener('activate', e => { /* czyszczenie starych cache */ self.clients.claim(); });
self.addEventListener('fetch', e => { /* cache-first + revalidate w tle */ });
```

**Strategia fetch:**
- jeśli zasób jest w cache → zwróć z cache, w tle pobierz fresh i nadpisz cache
- jeśli brak w cache → pobierz z sieci, zapisz do cache, zwróć
- jeśli sieć niedostępna i brak w cache → fallback do `./index.html`

### 3.5. manifest.json

Standardowa konfiguracja PWA. Kluczowe pola:

```json
{
  "name": "SIŁKA 3",
  "short_name": "SIŁKA3",
  "start_url": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [...]
}
```

### 3.6. google-apps-script.gs

Kod backendu po stronie Google. **Nie jest używany przez aplikację** — istnieje w repo jako referencja. Skrypt wdrożony jest w prywatnym Google Account właściciela jako Web App. URL Web App jest wpisywany w aplikacji przez użytkownika (3× klik w wersję → input).

Kontrakt:

**POST `?` (action=append):**
- Body: `{ "action": "append", "rows": [{ num, date, dow, duration, break_days, avg_3m, avg_br }, ...] }`
- Skrypt dopisuje wiersze do arkusza
- Aplikacja używa `mode: 'no-cors'` → nie czyta odpowiedzi, sukces zakładany

**GET `?action=read`:**
- Skrypt zwraca JSON: `{ "rows": [{ date, duration }, ...] }`
- Aplikacja parsuje i zastępuje historię

### 3.7. Photos/

Statyczne zasoby graficzne. Nazwy plików muszą być **identyczne case-sensitive** z odwołaniami w kodzie (GitHub Pages serwuje z systemu Linux, który rozróżnia `Bateria.png` i `bateria.png`).

---

## 4. Model danych

### 4.1. Schemat głównego obiektu `state`

State jest pojedynczym obiektem JS przechowywanym w pamięci podczas działania aplikacji i serializowanym do localStorage przy każdej zmianie.

```javascript
state = {
  version: 2,                      // wersja schematu (= STORAGE_VERSION)
  exercises: [ { ... }, ... ],     // lista ćwiczeń (porządek jest istotny — kolejność w UI)
  history: [ { ... }, ... ],       // historia treningów
  current: null | { ... },         // bieżący trening lub null
  packingDate: null | "YYYY-MM-DD",// data ostatniego pakowania
  goalDays: 3.5,                   // cel — co ile dni trening (próg dla kolorów)
}
```

#### 4.1.1. `exercises` — pojedyncze ćwiczenie

```javascript
{
  id: 1,                          // unikalny numer (1..15 domyślnie)
  name: 'Ćwiczenie 8',            // nazwa wyświetlana
  img: 'Photos/8.jpg',            // ścieżka do obrazka (zwykle Photos/<id>.jpg)
  helperImages: [],               // dodatkowe zdjęcia pomocnicze (rzadko)
  sets: 4,                        // liczba serii do wykonania
  reps: '12',                     // powtórzenia (string, np. "12-15", "12", "5-10 min")
  weight: '10 kg' | null,         // waga jako string (po migracji v2), null = brak
  active: true,                   // ćwiczenie aktywne (false = ukryte z listy)
  restTimer: true,                // czy uruchamiać odliczanie po serii
  restSeconds: 60,                // długość przerwy w sekundach
  isTime: false                   // true tylko dla rozgrzewki — nie liczy się jako "seria"
}
```

**Uwagi:**
- `weight` przechowywane jako **string** (`'10 kg'`, `'12-18 kg'`, `null`). W starej wersji była liczbą, jest migracja w `loadState()`.
- `active=false` ukrywa ćwiczenie z listy ale **zachowuje** je w state (można przywrócić edycją).

#### 4.1.2. `history` — pojedynczy wpis

```javascript
{
  date: '2026-04-19',             // data ISO YYYY-MM-DD
  duration: '01:45',              // czas trwania jako "HH:MM" string
  exported: true | false          // czy wpis już wysłany do Sheets
}
```

**Uwagi:**
- `exported=false` → przy następnym eksporcie będzie wysłany
- Po migracji ze starej wersji: wszystkie domyślne wpisy startowe mają `exported=false` żeby pierwszy eksport wysłał całość

#### 4.1.3. `current` — bieżący trening

```javascript
{
  startedAt: 1714000000000,        // ms timestamp startu (Date.now())
  date: '2026-05-10',              // data treningu (ISO)
  exerciseId: 8,                   // id aktualnie wykonywanego ćwiczenia (lub null = lista)
  sets: { 8: 2, 11: 4 },           // mapa exerciseId → liczba wykonanych serii
  completedExercises: [1, 2, 8],   // lista id ukończonych ćwiczeń
  pausedAt: null | timestamp,      // jeśli ekran w trybie czuwania
}
```

**Uwagi:**
- `null` = brak trwającego treningu
- Klucze obiektu `sets` to **stringi** (JS zamienia liczby na stringi), używaj `String(id)` przy odczycie

#### 4.1.4. `packingDate`

ISO data (string) — kiedy ostatnio użytkownik potwierdził spakowanie torby (kliknął ✓ na ekranie pakowania). Używane do logiki ikony 🎒 na ekranie głównym (zielona/szara w zależności od dni od pakowania).

#### 4.1.5. `goalDays`

Liczba (np. `3.5`) — cel czasowy: średnia długość przerwy między treningami w dniach. Używana jako próg dla kolorów wartości "3M" i "BR" w historii (zielony jeśli średnia ≤ goalDays, czerwony jeśli >).

### 4.2. Klucze localStorage

| Klucz | Typ wartości | Wpisywany przez | Czytany przez | Opis |
|-------|--------------|-----------------|---------------|------|
| `silka3_state_v2` | JSON state | `saveState()` | `loadState()` | Cały state aplikacji |
| `silka3_state_v1` | JSON state | (stara wersja) | `loadState()` migracja | Migracja przy starcie |
| `silka3_appscript_url` | string URL | input użytkownika (3× klik w wersję) | export/import | URL Apps Script Web App |

### 4.3. Format eksportu do Google Sheets

Funkcja `buildHistoryRows()` buduje wiersze. Wysyłane do Apps Script jako JSON:

```javascript
{
  action: 'append',
  rows: [
    {
      num: 33,                  // numer treningu (najwyższy = najnowszy)
      date: '2026-04-19',       // ISO
      dow: 'niedziela',         // dzień tygodnia po polsku
      duration: '01:45',        // HH:MM
      break_days: 3,            // dni od poprzedniego treningu
      avg_3m: 4.12,             // średnia z ostatnich 3 mies (dni między treningami)
      avg_br: 3.87              // średnia w bieżącym roku
    },
    ...
  ]
}
```

Wysyłane są tylko wiersze z `exported=false`. Po próbie wysłania (request) wszystkie wybrane wpisy są oznaczane `exported=true` **niezależnie od sukcesu** (no-cors → brak wglądu w odpowiedź).

### 4.4. Migracje danych

Przy `loadState()`:
1. Próba wczytania z `silka3_state_v2` (aktualny)
2. Jeśli brak → próba wczytania ze starego `silka3_state_v1` i konwersja
3. Jeśli brak obu → `defaults` (defaultExercises + defaultHistory)
4. Migracje w aktualnej wersji v2:
   - Brak pola `exported` w wpisie historii → `exported=false`
   - Brak `current.completedExercises` → `[]`
   - Brak `packingDate` → `null`
   - Brak/null `goalDays` → `3.5`
   - Brak `restSeconds` przy ćwiczeniu → `60`
   - `weight` jako liczba → konwersja na string `"<n> kg"`

---

## 5. Logika ekranów

### 5.1. screen-home (strona startowa)

#### 5.1.1. Co wyświetla

- Duży przycisk START (lub WZNÓW jeśli istnieje `state.current`)
- Ikona 🎒 (status pakowania): zielona jeśli `packingDate === todayISO()`, czerwona jeśli niespakowane lub odległe
- Tytuł "SIŁKA 3" + tag wersji
- Tabela historii z kolumnami: 🔢 (numer), 📅 (data), 🗓️ (dzień), ⏱️ (czas), 🔁 (przerwa), 3M, BR
- Przyciski w nagłówku tabeli: ✏️ przy 📅 (edycja dat), ✏️ przy 3M (edycja celu), ⤓ przy BR (import)
- Dolny róg: install-hint jeśli przeglądarka oferuje instalację PWA
- Po skończonym treningu (przez krótki czas po finishTraining): obrazek `Photos/fotokoniec.jpg`

#### 5.1.2. Akcje użytkownika

| Akcja | Funkcja | Efekt |
|-------|---------|-------|
| Klik START | `startTrainingFlow()` | Idzie do pakowania (jeśli niespakowane) lub od razu do screen-list |
| Trzymanie START 2 s | timer w `setupBigButtonHold()` | Modal: "Zresetować trening?" → reset `state.current` |
| Klik 🎒 | `togglePacking()` | Reset `packingDate` na null |
| Klik wersji 3× | `setupVersionTripleClick()` | Prompt o URL Apps Script |
| Klik ✏️ przy 📅 | tryb edycji historii | Każdy wiersz staje się klikalny (otwiera kalendarz) |
| Klik ✏️ przy 3M | `openGoalEditDialog()` | Modal z input liczbowym (cel w dniach) |
| Klik ⤓ przy BR | `importFromSheets()` | Pobranie historii z arkusza |
| Tap kafelka pakowania (jeśli ekran pakowania jest aktywny) | `togglePackItem()` | Zaznacz/odznacz |

#### 5.1.3. Kolory wierszy historii

- Tło wiersza: pierwsze 3 wiersze (najnowsze) — zielone, kolejne 4 — pomarańczowe, kolejne 5 — żółte, dalej szare. Patrz `historyRowClassByAge()`.
- Kolor wartości "🔁" (dni przerwy):
  - zielony: ≤ goalDays
  - żółty: między
  - czerwony: znacznie > goalDays
- Kolor wartości "3M" / "BR":
  - zielony: średnia ≤ goalDays I okres obserwacji ≥ 90/365 dni
  - pomarańczowy: średnia ≤ goalDays ale za krótki okres, LUB > goalDays ale poprawia się
  - czerwony: > goalDays i pogarsza się

### 5.2. screen-pack (pakowanie)

#### 5.2.1. PACK_ITEMS

Lista 11 przedmiotów do zabrania na siłownię, każdy ma własny obrazek PNG w katalogu `Photos/`. Definicja w `app.js`:

```javascript
const PACK_ITEMS = [
  { id: 'batki',     img: 'Photos/batki.png'     },
  { id: 'skarpy',    img: 'Photos/skarpetki.png' },
  { id: 'spodenki',  img: 'Photos/spodenki.png'  },
  { id: 'koszulka',  img: 'Photos/koszulka.png'  },
  { id: 'buty',      img: 'Photos/buty.png'       },
  { id: 'klapki',    img: 'Photos/klapki.png'     },
  { id: 'reczniki',  img: 'Photos/2ręczniki.png'  },
  { id: 'poduszka',  img: 'Photos/poduszka.png'   },
  { id: 'woda',      img: 'Photos/woda.png'       },
  { id: 'izotonic',  img: 'Photos/isotonic.png'   },
  { id: 'shake',     img: 'Photos/shake.png'      },
];
```

Kafelki w siatce 3-kolumnowej. Kliknięcie kafelka przyciemnia obraz (klasa `.packed`). Po przyciemnieniu wszystkich (lub klik ✓) — ekran znika i przechodzi do screen-list.

#### 5.2.2. Logika

```javascript
let packChecked = new Set();  // id zaznaczonych w bieżącej sesji pakowania

function togglePackItem(id) {
  if (packChecked.has(id)) packChecked.delete(id);
  else packChecked.add(id);
  // Re-render kafelka (klasa .packed)
  if (packChecked.size === PACK_ITEMS.length) confirmPacking(true);
}

function confirmPacking(auto) {
  state.packingDate = todayISO();
  saveState();
  // animacja celebration → przejście do screen-list
}
```

### 5.3. screen-list (lista ćwiczeń)

#### 5.3.1. Renderowanie

Kontener `<ul id="exerciseList">` wypełniany przez `renderExerciseList()`. Każdy `<li class="exercise-item">` ma:

- Thumbnail (mały obrazek ćwiczenia)
- Nazwa
- Status serii (np. "0/4")
- Kule serii (po jednej na każdą serię, kolory: ✓ zielone wykonane, ⏳ żółte trwające, ⭕ szare puste)

Po kliknięciu w ćwiczenie → `showScreen('screen-exercise')` z aktywnym ćwiczeniem.

#### 5.3.2. Tryb edycji (drag & drop)

Aktywowany przez ✏️ ikonę w prawym górnym rogu. Każde ćwiczenie staje się reorderowalne (drag-and-drop) i można je dodać/usunąć.

### 5.4. screen-exercise (wykonanie ćwiczenia)

#### 5.4.1. Layout

- **Górny panel** (top-panel): liczniki "wykonane / pozostałe", środek — strzałka wstecz + zegar treningu, prawo — duży zielony ✓ (konfirmacja serii) lub mały licznik przerwy
- **exercise-body**: parametry po lewej (kolumna), zdjęcie ćwiczenia po prawej. Pod spodem `<div class="helper-images">` (zwykle pusty)
- **Przycisk ⚙** w prawym górnym rogu — otwiera modal edycji parametrów

#### 5.4.2. Cykl serii

```
START → renderExerciseScreen()
  → użytkownik wykonuje serię
  → klik ✓ (btnConfirmSet2)
    → confirmSet(): state.current.sets[id]++; saveState()
    → if (sets[id] < ex.sets):
        startRestCountdown()         # rozpoczyna odliczanie przerwy
      else:
        showCelebration() → goToNextExerciseOrList()
  → po przerwie: finishRestCountdown()
    → wibracja + miganie zielone
    → setButtonMode('green') → ekran wraca do gotowości na następną serię
```

#### 5.4.3. Przycisk ⚙

`btnEditExercise` otwiera modal `formEditExercise` z polami:
- Nazwa
- Serie (number)
- Powtórzenia (text — bo dopuszczalne formaty "12", "12-15", "5-10 min")
- Waga (text — bo "10 kg", "12-18 kg")
- Checkbox "Ćwiczenie aktywne"
- Checkbox "Odliczanie przerwy" + input "Sekund"

Po zapisaniu — `state.exercises[i] = ...; saveState(); renderExerciseScreen();`

#### 5.4.4. Tryb czuwania

Element `#standbyTrigger` to niewidoczna strefa w dolnej 1/3 ekranu ćwiczenia. Tap = pojawia się `#standbyOverlay` (czarny ekran). Tap czarnego ekranu = powrót.

Cel: można odłożyć telefon ekranem do dołu podczas serii i nie martwić się że ekran zaśnie/wibruje przy ruchu kieszeni.

### 5.5. Modale

#### 5.5.1. modalEditExercise

Edycja parametrów ćwiczenia. Otwierany przez ⚙. Zapisuje przez `formEditExercise.onsubmit`. Pola opisane w 5.4.3.

#### 5.5.2. modalDatePicker

Kalendarz wyboru daty (do edycji wpisu historii). Generowany przez `renderCalendar(monthOffset)`. Nawigacja ‹ › zmienia miesiąc.

#### 5.5.3. modalConfirm

Generyczny dialog Tak/Nie używany do potwierdzeń destrukcyjnych (reset treningu, kasowanie wpisu historii).

API:
```javascript
showConfirm(title, text, () => { /* on yes */ });
```

---

## 6. Kluczowe przepływy (use cases)

### 6.1. Pełny trening

1. **Strona startowa** — klik START
2. Jeśli `state.packingDate !== todayISO()` → **screen-pack**, użytkownik tappuje kafelki, klika ✓ lub po wszystkich automatycznie idzie dalej
3. **screen-list** — generuje się `state.current = { startedAt, date, sets: {}, completedExercises: [] }`
4. Klik w ćwiczenie → **screen-exercise**
5. Wykonanie serii w głowie → klik dużego ✓
6. Inkrementacja `state.current.sets[id]`
7. Jeśli zostały serie → `startRestCountdown()` → czarny ekran z dużymi sekundami
8. Po sekundach → wibracja + zielony błysk → przycisk ✓ znów aktywny → wracamy do 5
9. Gdy wszystkie serie ukończone → animacja supernowy → przejście do następnego ćwiczenia (lub `screen-list`)
10. Gdy wszystkie ćwiczenia w `completedExercises` → `finishTraining()`:
    - Oblicz `duration` z `Date.now() - startedAt`
    - Dodaj wpis do `state.history` z `exported=false`
    - `state.current = null`
    - `renderHome()` + `showScreen('screen-home')`
    - W tle: jeśli LS_APPSCRIPT skonfigurowany → `exportPendingToSheets()` (fire-and-forget)

### 6.2. Edycja ćwiczenia w trakcie

Klik ⚙ → modal → zmiana → zapis → `renderExerciseScreen()` odświeża widok bez utraty postępu w `state.current.sets`.

### 6.3. Anulowanie / reset treningu

Trzymanie przycisku START 2 s na ekranie głównym → modalConfirm "Zresetować trening?" → `state.current = null; saveState(); renderHome()`.

Postęp jest tracony bezpowrotnie (nie ma cofnięcia).

### 6.4. Pomijanie odliczania przerwy

Klik gdziekolwiek w ekran `#restOverlay` → `skipRest()`:
- Zatrzymuje interval
- Ukrywa overlay
- Symuluje koniec przerwy (jak `finishRestCountdown` ale bez wibracji)

### 6.5. Eksport do Sheets

Wywoływany w **tle po `finishTraining()`** (fire-and-forget). Jeśli URL Apps Script niesckonfigurowany → toast "Eksport: kliknij 3× w wersję, by skonfigurować URL".

`exportPendingToSheets(url)`:
1. Filtruje historię na `exported=false`
2. Buduje pełne wiersze (z numerem, dniem tygodnia, średnimi)
3. POST `mode: 'no-cors'` na URL
4. Po request: `exported=true` dla wysłanych (optymistycznie)
5. Toast "Wyeksportowano do arkusza ✓" lub błąd

### 6.6. Edycja daty w historii

1. Klik ✏️ przy 📅 w nagłówku → tryb edycji (klasa `.editing` na tabeli)
2. Klik wiersza → otwiera modalDatePicker z pre-zaznaczoną aktualną datą
3. Wybór daty → zapis → `state.history[i].date = newDate; saveState(); renderHome()`

### 6.7. Import z Sheets

Klik ⤓ → `importFromSheets()`:
1. GET `${url}?action=read`
2. Parsowanie JSON `{ rows: [...] }`
3. Mapowanie na format historii (date, duration, exported=true)
4. **Zastąpienie** całej lokalnej historii (nie merge — to świadoma decyzja, bo arkusz jest "źródłem prawdy")

### 6.8. Pierwsze uruchomienie

`loadState()` zwraca defaulty:
- `defaultExercises()` — 15 ćwiczeń o nazwach "Ćwiczenie 2", "Ćwiczenie 3" itd. (do zmiany przez użytkownika)
- `defaultHistory()` — historyczne wpisy z 2024–2026 (autorska historia właściciela aplikacji, użytkownik może podmienić importem)

### 6.9. Aktualizacja apki (przepływ deploy)

1. Programista zmienia kod w plikach
2. Bumpuje wersję w 4 miejscach:
   - `app.js`: `const APP_VERSION = 'vGPT_1.0.1';`
   - `sw.js`: `const CACHE_NAME = 'silka3-vGPT_1.0.1';`
   - `index.html`: `<link rel="stylesheet" href="styles.css?v=vGPT_1.0.1">`
   - `index.html`: `<script src="app.js?v=vGPT_1.0.1">`
3. Commit + push do `main`
4. GitHub Pages buduje (1–10 min)
5. Użytkownik otwiera apkę
6. Nowy SW się instaluje, ale **stary nadal serwuje** dopóki użytkownik nie zamknie wszystkich kart
7. Reaktywacja → nowy SW przejmuje
8. W praktyce: użytkownik kilka razy musi kilować apkę zanim zobaczy zmiany

**Rozwiązanie awaryjne** gdy cache nie chce się odświeżyć: Ustawienia Androida → Aplikacje → SIŁKA3 → Pamięć → Wyczyść pamięć podręczną + dane, ewentualnie odinstalować PWA i zainstalować ponownie.

---

## 7. Funkcje JavaScript — referencja

### 7.1. Inicjalizacja i routing

| Funkcja | Co robi | Wywoływana z |
|---------|---------|--------------|
| `showScreen(id)` | Aktywuje wskazany screen, ukrywa inne | wszędzie po nawigacji |
| `bindEventHandlers()` | Podpina wszystkie event listenery (sekcja 11) | DOMContentLoaded |
| `registerServiceWorker()` | Rejestruje sw.js | DOMContentLoaded |

### 7.2. State management

| Funkcja | Co robi | Side effects |
|---------|---------|--------------|
| `loadState()` | Wczytuje state z localStorage z migracją | — |
| `saveState()` | Zapisuje state do localStorage | localStorage write |
| `defaultExercises()` | Zwraca tablicę 15 domyślnych ćwiczeń | — |
| `defaultHistory()` | Zwraca tablicę domyślnej historii | — |

### 7.3. Renderowanie

Wszystkie funkcje render przebudowują DOM od zera (innerHTML lub createElement w pętli). Brak diffowania.

| Funkcja | Renderuje |
|---------|-----------|
| `renderHome()` | screen-home (przycisk + tabela historii + ikona 🎒) |
| `renderHistoryTable()` | tylko `<tbody>` historii |
| `renderPackScreen()` | screen-pack (kafelki) |
| `renderExerciseList()` | screen-list (ul ćwiczeń) |
| `renderExerciseScreen(id)` | screen-exercise (parametry, obrazek, helper-images) |
| `renderExerciseParams(ex, container)` | tylko parametry w sidebar |
| `renderCalendar(monthOffset)` | siatka dni w modalDatePicker |

### 7.4. Logika treningu

| Funkcja | Sygnatura | Co robi |
|---------|-----------|---------|
| `startTrainingFlow()` | () | Klik START — pakowanie albo od razu lista |
| `confirmSet()` | () | Inkrementuje sets[id], albo startRestCountdown, albo następne ćwiczenie |
| `goToNextExerciseOrList(currentId)` | (id) | Wybiera następne aktywne ćwiczenie lub screen-list |
| `finishTraining()` | () | Dodaje wpis do history, czyści current, wraca na home, eksport w tle |

### 7.5. Odliczanie przerwy

| Funkcja | Co robi |
|---------|---------|
| `startRestCountdown()` | Pokazuje overlay + uruchamia setInterval co 1 s |
| `updateRestUI()` | Aktualizuje wyświetlaną cyfrę sekund |
| `finishRestCountdown()` | Ukrywa overlay, wibracja, zielony błysk, setButtonMode('green') |
| `skipRest()` | Skraca przerwę (klik w overlay) |

Stan globalny:
```javascript
let restRemaining = 0;
let restInterval = null;
let restDoneTimer = null;
```

### 7.6. Edycja ćwiczeń

| Funkcja | Co robi |
|---------|---------|
| `openEditExerciseModal(id)` | Wypełnia formularz danymi ćwiczenia, otwiera modal |
| `saveExerciseFromForm()` | Czyta inputy, aktualizuje state.exercises[i], zamyka modal |
| `deleteExercise(id)` | Modal confirm → usuwa z state.exercises |

### 7.7. Historia

| Funkcja | Co robi |
|---------|---------|
| `sortedHistoryDesc()` | Zwraca historię posortowaną od najnowszej |
| `buildTrainingNumbers(list)` | Numeruje treningi (najwyższy = najnowszy) |
| `daysBetween(iso1, iso2)` | Liczba dni między datami |
| `avg3M(date, hist)` | Średnia przerwa w ostatnich 3 miesiącach przed datą |
| `avgBR(date, hist)` | Średnia w bieżącym roku |
| `historyRowClassByAge(idx)` | Klasa CSS dla wiersza wg wieku (zielony/żółty/szary) |

### 7.8. Pakowanie

| Funkcja | Co robi |
|---------|---------|
| `renderPackScreen()` | Generuje kafelki z PACK_ITEMS |
| `togglePackItem(id)` | Toggle w `packChecked` |
| `confirmPacking(auto)` | Ustawia packingDate=today, animacja, przejście dalej |
| `cancelPacking()` | Powrót do screen-home bez zmiany packingDate |

### 7.9. Eksport / Import

| Funkcja | Co robi |
|---------|---------|
| `buildHistoryRows()` | Buduje pełne wiersze (z numerami, średnimi) |
| `exportPendingToSheets(url)` | POST tylko wpisów exported=false → oznacza jako exported=true |
| `importFromSheets()` | GET `?action=read` → zastępuje state.history |

### 7.10. Animacje i efekty

| Funkcja | Co robi |
|---------|---------|
| `showCelebration(cb)` | Animacja supernowej (zielony rozbłysk) z callback po zakończeniu |
| `vibratePhone(pattern)` | Wrapper na navigator.vibrate (z try/catch) |
| `showToast(msg, kind)` | Toast na 2.5 s, kind = 'ok' | 'err' |
| `showConfirm(title, text, onYes)` | Modal Tak/Nie |

### 7.11. Helpery

| Funkcja | Co robi |
|---------|---------|
| `pad2(n)` | "5" → "05" |
| `toISODate(d)` | Date → "YYYY-MM-DD" |
| `fromISODate(s)` | "YYYY-MM-DD" → Date |
| `todayISO()` | Dzisiejsza data jako ISO |
| `fmtDateShort(iso)` | "2026-04-19" → "19 kwi" |
| `fmtDow(iso)` | "2026-04-19" → "niedziela" |
| `fmtTrainingDuration(sec)` | sekundy → "01:45" |
| `fmtClock(sec)` | sekundy → "0:00" (zegar) |
| `addMonths(date, n)` | Dodaje n miesięcy do daty |
| `releaseWakeLock()` | Wake Lock release |

---

## 8. Integracje zewnętrzne

### 8.1. Google Apps Script

#### 8.1.1. Konfiguracja URL

URL jest wpisywany przez użytkownika w aplikacji. Trigger: **klik 3× w tag wersji** (`#versionTag`) w prawym górnym rogu strony głównej. Pojawia się prompt — użytkownik wkleja URL Web App. Zapisywany w `localStorage[LS_APPSCRIPT]`.

#### 8.1.2. Format zapytania POST

```http
POST {url}
Content-Type: text/plain
Mode: no-cors

{ "action": "append", "rows": [ {...}, ... ] }
```

`mode: 'no-cors'` jest wymuszony bo Apps Script nie zwraca CORS headers — aplikacja **nie czyta odpowiedzi**, zakłada sukces.

#### 8.1.3. Format odpowiedzi GET

```http
GET {url}?action=read

→ { "rows": [ { "date": "2026-04-19", "duration": "01:45" }, ... ] }
```

GET nie ma problemu CORS — Apps Script zwraca poprawne headers w doGet.

#### 8.1.4. Obsługa błędów

- Brak URL → toast "Eksport: kliknij 3× w wersję, by skonfigurować URL"
- Błąd sieci → toast "Eksport nieudany — przy następnym treningu"
- Niepoprawny JSON z arkusza (przy imporcie) → toast "Niepoprawny JSON z arkusza"
- HTTP != 200 → toast z kodem błędu

### 8.2. Google Fonts

Dwa fonty: **Rajdhani** (interfejs ogólny) i **Orbitron** (cyfry odliczania). Ładowane z `fonts.googleapis.com` przez `<link rel="preconnect">` i Service Worker je cachuje.

### 8.3. Web APIs

| API | Gdzie używane |
|-----|---------------|
| `localStorage` | persystencja state |
| `navigator.vibrate(pattern)` | wibracja po przerwie |
| `navigator.wakeLock.request('screen')` | utrzymanie ekranu włączonego podczas treningu |
| `Service Worker API` | offline + cache |
| `BeforeInstallPromptEvent` | install hint dla PWA |
| `fetch()` | komunikacja z Apps Script |
| `setInterval`, `setTimeout` | odliczanie i animacje |
| `requestAnimationFrame` | timing animacji |

---

## 9. Konwencje i wzorce w kodzie

### 9.1. Konwencja nazewnictwa

- Stałe: `UPPER_SNAKE_CASE` (`STORAGE_KEY`, `REST_SECONDS`)
- Prefix `LS_` dla kluczy localStorage (`LS_APPSCRIPT`)
- Funkcje i zmienne: `camelCase`
- Klasy CSS: `kebab-case`, BEM-like (`.exercise-item__thumb`, `.btn--primary`)
- ID DOM: `camelCase` (`btnConfirmSet2`, `historyBody`)

### 9.2. Numerowane sekcje w app.js

Każda sekcja oznaczona komentarzem typu:

```javascript
// ---------------------------------------------------------------
// 5. RENDEROWANIE
// ---------------------------------------------------------------
```

Przy dodawaniu nowych funkcji — umieszczać w odpowiedniej sekcji według tematyki. Numer sekcji to przyjęty system organizacyjny, nie należy go zmieniać.

### 9.3. Wzorzec event handlerów

Większość handlerów podpinana jest **bezpośrednio** w `bindEventHandlers()`:

```javascript
document.getElementById('btnStart').addEventListener('click', startTrainingFlow);
```

Dla dynamicznie generowanych elementów (np. wiersze historii, kule serii) — **delegacja**:

```javascript
document.getElementById('historyBody').addEventListener('click', (e) => {
  const row = e.target.closest('tr.history-row');
  if (row) handleHistoryRowClick(row);
});
```

### 9.4. Brak frameworka — patterns ręczne

#### 9.4.1. Re-render po każdej zmianie state

Funkcje renderujące są **idempotentne**: można je wywołać wielokrotnie z tym samym efektem. Po każdej mutacji `state` należy:

1. `saveState()` — persystencja
2. Wywołać odpowiednią funkcję `render*()` — odświeżenie UI

#### 9.4.2. Brak diff/virtual DOM

Każda funkcja renderująca zwykle:

```javascript
function renderExerciseList() {
  const ul = document.getElementById('exerciseList');
  ul.innerHTML = '';
  state.exercises.filter(e => e.active).forEach(ex => {
    const li = document.createElement('li');
    // ... build li ...
    ul.appendChild(li);
  });
}
```

Konsekwencja: **focus** w inputach jest tracony po render. Dlatego dla pól edytowalnych w trakcie pisania (np. weight w modalu) — handler `onsubmit` zamiast `oninput`.

### 9.5. Komentarze w kodzie

- Nagłówki sekcji: blok 3 linii z `---...---`
- Komentarze inline: po polsku
- TODO znaczane przez `// TODO:` lub `// FIXME:`

---

## 10. Stylowanie (CSS) — konwencje

### 10.1. CSS variables jako single source of truth

Wszystkie kolory wynikają z `:root`. Zmiana koloru akcentu = zmiana 1 zmiennej.

### 10.2. BEM-like naming

```css
.block { }                    /* główny element */
.block__element { }           /* część bloku */
.block--modifier { }          /* wariant bloku */
.block__element--modifier { } /* wariant części */
```

Przykłady:
- `.exercise-item`, `.exercise-item__thumb`, `.exercise-item--active`
- `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--danger`
- `.modal`, `.modal__sheet`, `.modal__head`, `.modal__foot`

### 10.3. Klasy stanu

- `.active` — aktywny screen, aktywny tab
- `.muted` — wyciszony (low opacity)
- `.faded` — wyblakły (jeszcze niżej)
- `.done` — ukończone
- `.packed` — zaznaczone w pakowaniu
- `.editing` — tryb edycji historii
- `.hidden` (atrybut, nie klasa) — `display: none !important`

### 10.4. Z-index tier list

| Element | z-index | Cel |
|---------|---------|-----|
| `.standby-trigger` | 5 | trigger w tle |
| `.rest-overlay` | 40 | overlay przerwy |
| `.rest-done-overlay` | 45 | zielone miganie |
| `.celebration` | 50 | rozbłysk supernowej |
| `.modal` | 100 | modale |
| `.toast` | 200 | toast (najwyżej) |

### 10.5. Safe-area dla notch

```css
:root {
  --safe-t: env(safe-area-inset-top, 0px);
  --safe-b: env(safe-area-inset-bottom, 0px);
}
.top-panel { padding-top: max(8px, var(--safe-t)); }
```

---

## 11. Service Worker — szczegóły

### 11.1. Strategia

**Cache-first z stale-while-revalidate**:

1. Request przychodzi
2. Szukaj w cache → znaleziono? → **zwróć z cache** (szybko, offline-friendly)
3. Niezależnie: w tle pobierz z sieci → jeśli sukces → **nadpisz cache** (przygotowane dla następnego razu)
4. Nie znaleziono w cache → fetch z sieci → cache + zwróć
5. Sieć nie działa i brak cache → fallback do `./index.html`

### 11.2. Kiedy SW pobiera nową wersję

Zmiana `CACHE_NAME` w `sw.js` powoduje że przy następnej instalacji wszystko jest pobierane od zera. Bez zmiany `CACHE_NAME` — SW pre-cachuje stary `CACHE_NAME` ale fetch zwraca z cache (bez sprawdzania czy plik się zmienił).

**Wniosek:** zawsze bumpować `CACHE_NAME` przy każdym deploy.

### 11.3. Aktualizacja — UX

Pierwsza wizyta po deploy:
1. SW pobiera `index.html` (z cache, stary)
2. Browser parsuje, ładuje `styles.css?v=X.Y.Z` — to nowy URL bo `?v` się zmienia → fetch z sieci, cache odświeżony
3. Ale `index.html` nadal stary → użytkownik widzi stare info-bary, ale style/JS są nowe

Dlatego ważne też cachebusting URL `?v=X.Y.Z` w `index.html` — żeby `index.html` się odświeżył przy zmianie.

### 11.4. Debug SW

Chrome DevTools → Application → Service Workers:
- Status (waiting, active)
- "Update on reload"
- "Bypass for network"
- Unregister

`chrome://inspect/#service-workers` na desktopie — globalny widok wszystkich SW.

### 11.5. Wymuszanie u użytkownika

Procedura odświeżenia gdy cache się zacina:

1. Zamknąć wszystkie karty / instancje aplikacji
2. Otworzyć ponownie → SW się reaktywuje, czyści stary cache
3. Jeśli to nie pomaga: Ustawienia Androida → Aplikacje → SIŁKA3 → Pamięć → "Wyczyść pamięć podręczną" + "Wyczyść dane"
4. Ostateczność: odinstalować PWA (długi przycisk → "Odinstaluj"), wejść na URL w przeglądarce, zainstalować ponownie

---

## 12. Wersjonowanie i publikacja

### 12.1. Schemat wersji

Semantyczne wersjonowanie luźno (`MAJOR.MINOR.PATCH`):

- MAJOR (1.x.x) — gigantyczna zmiana, niezgodność danych
- MINOR (x.6.x) — nowa funkcja
- PATCH (x.x.3) — fix lub mała korekta

### 12.2. Lista miejsc do bumpu wersji

Przy każdym deploy zmienić w **4 miejscach**:

1. `app.js`: `const APP_VERSION = 'vGPT_1.0.1';`
2. `sw.js`: `const CACHE_NAME = 'silka3-vGPT_1.0.1';`
3. `index.html`: `<link rel="stylesheet" href="styles.css?v=vGPT_1.0.1" />`
4. `index.html`: `<script src="app.js?v=vGPT_1.0.1"></script>`

Pomyłka w którymkolwiek miejscu = ryzyko że użytkownik będzie widział starą wersję.

### 12.3. Workflow publikacji

1. Commit zmian na lokalnym branchu
2. `git push origin main`
3. GitHub Pages automatycznie buduje (Actions tab — sprawdzić czy zielone)
4. Czekać 1–10 minut na propagację CDN
5. Test: otworzyć URL w incognito, sprawdzić wersję
6. Test: zainstalowana PWA — kilu i otworzyć ponownie kilka razy

### 12.4. Czas propagacji

W praktyce: 1–3 minuty zwykle wystarcza. Maksymalnie 10 minut. Jeśli po 15 minutach nadal stara wersja — sprawdź commit, czy faktycznie jest na branchu `main`.

---

## 13. Testowanie

### 13.1. Brak testów automatycznych

Aktualnie nie ma żadnych testów (jest to dług techniczny). Cały testing jest manualny.

### 13.2. Test manualny — checklist po każdej zmianie

Minimalny checklist po deploy:

- [ ] Strona główna ładuje się
- [ ] Wersja wyświetla się poprawnie (powinna być nowa)
- [ ] Tabela historii jest niepusta
- [ ] Klik START przechodzi dalej
- [ ] Klik w ćwiczenie otwiera screen-exercise
- [ ] Klik ✓ inkrementuje serię
- [ ] Po serii pojawia się odliczanie przerwy
- [ ] Klik w ekran przerwy ją skraca
- [ ] Po wszystkich ciekawszych zmianach — full trening end-to-end
- [ ] Edycja ćwiczenia (⚙) działa
- [ ] Reset trzymaniem START 2 s działa
- [ ] Tryb czuwania (tap dolnej 1/3 ekranu ćwiczenia) działa
- [ ] Eksport do Sheets (jeśli URL skonfigurowany)
- [ ] PWA: instalacja na mobile

### 13.3. Środowiska testowe

- **Lokalny serwer**: `cd <katalog>; python3 -m http.server 8000` → http://localhost:8000/
- **GitHub Pages**: główne środowisko produkcyjne
- **Instalowana PWA na telefonie**: ostateczne środowisko docelowe

### 13.4. Narzędzia debug

- **Chrome DevTools** (F12) → Application → localStorage / Service Workers / Manifest
- **Remote debug Android**: `chrome://inspect/#devices` (telefon w trybie developera, USB debug ON)
- **Console**: `console.log(state)` z DevTools żywego widoku

---

## 14. Znane problemy i ograniczenia

### 14.1. Cache PWA

Problem: po deploy użytkownik czasem nie widzi nowej wersji.

Rozwiązanie: kombinacja bumpu `CACHE_NAME` + cache-busting `?v=`. Mimo to czasem trzeba kilować apkę kilka razy.

### 14.2. Wibracja na Pixel 8 Pro

Android agresywnie ogranicza wibracje aplikacjom w tle. Mimo wzorca `[500, 200, 500, 200, 500, 200, 700]` + backup po 100ms, nie zawsze odpala. Próbowane już wszystkie znane rozwiązania.

### 14.3. Limit localStorage

~5–10 MB. Aktualny state to ~10–50 KB. Nie ma realnego ryzyka przekroczenia w obecnej wersji.

### 14.4. Brak synchronizacji między urządzeniami

Każde urządzenie ma własny localStorage. Synchronizacja tylko przez ręczny eksport → import.

### 14.5. CORS przy eksporcie

`mode: 'no-cors'` przy POST → nie czytamy odpowiedzi. Skrypt mógłby zwracać "OK" / błąd, ale aplikacja nie ma jak tego sprawdzić. Rozwiązanie alternatywne: opublikować Apps Script z proper CORS headers (wymaga Apps Script + dodatkowe nakłady), nie zostało zrealizowane.

### 14.6. iOS Safari

Aplikacja nie była systematycznie testowana na iOS. Wibracja API nie istnieje, niektóre features PWA są ograniczone. Główne ekrany powinny działać ale brak gwarancji.

---

## 15. Plan rozwoju i otwarte zadania

### 15.1. Lista TODO (z dyskusji z właścicielem)

Pozostałe sprawy z roadmapy które nie są zrealizowane lub niedokończone:

- Graficzne odliczanie z baterią — zrealizowane w `vGPT_1.0.0`
- Wibracja Pixel 8 Pro — nadal niespójna
- Wzorzec wibracji do dostrojenia z eksperymentami
- Zegar treningu na ekranie ćwiczenia — można dopracować estetycznie
- Zdjęcia ćwiczeń (`Photos/<id>.jpg`) — wymagają finalizacji
- Konfiguracja URL Apps Script przez UI (dziś przez prompt) — można poprawić UX

### 15.2. Dług techniczny

- Brak testów
- `app.js` rozrasta się (~1960 linii) — warto rozbić na moduły lub przynajmniej lepiej podzielić na pliki
- Brak typów (TypeScript)
- Brak buildu (minifikacja)

### 15.3. Pomysły do rozważenia

- Wykres długości treningu w czasie (canvas, recharts, czy SVG ręcznie)
- Notatki do każdego treningu
- Wiele profili (multiple użytkowników w tej samej apce)
- Cloud sync zamiast Sheets (Firebase, Supabase)

---

## 16. Procedura wdrożenia w tryb przejęcia

### 16.1. Dostępy do przekazania

| Co | Gdzie | Kto ma |
|----|-------|--------|
| Repozytorium GitHub | `BG-user-OK/SILKA3_vGPT` (publiczne) | właściciel — collaborator dla nowego IT |
| Google Apps Script | Konto Google właściciela | właściciel — może udostępnić |
| Arkusz Google Sheets | Konto Google właściciela | właściciel — można udostępnić |
| Plik `Bateria.png` i inne zasoby | W repo | publiczne |

### 16.2. Klonowanie i lokalne uruchomienie

```bash
git clone https://github.com/BG-user-OK/SILKA3_vGPT.git
cd SILKA3_vGPT
python3 -m http.server 8000
# otwórz http://localhost:8000/
```

Brak buildu, brak npm install. Pliki działają od razu.

### 16.3. Pierwsze zmiany testowe

Bezpieczna pierwsza zmiana do potwierdzenia że pipeline działa:

1. Zmień `APP_VERSION` w 4 miejscach (z `vGPT_1.0.0` na `vGPT_1.0.1`)
2. Dodaj `console.log('test')` na początku `app.js`
3. Commit + push
4. Czekaj 2 min
5. Otwórz produkcję → sprawdź że wersja w UI = vGPT_1.0.1
6. Otwórz DevTools → Console → powinno być "test"

Jeśli to działa — pipeline OK.

### 16.4. Lista założeń wymagających potwierdzenia z właścicielem

Przed większymi zmianami warto skonsultować:

- Czy zachować dotychczasową strukturę 1 plik = 1 odpowiedzialność (1 JS, 1 CSS, 1 HTML)?
- Czy można przepisać na framework (np. lekki Preact, Svelte)?
- Czy dodać build (Vite, esbuild) i minifikację?
- Czy migrować z localStorage na IndexedDB (większe limity, async)?
- Czy dodać synchronizację cloud (Firebase / Supabase)?
- Czy zachować Apps Script jako backup, czy zastąpić proper backendem?
- Czy dopracować wygląd animacji ładowania baterii po testach na telefonie?

---

## 17. Załączniki

### 17.1. Przykładowy state (anonimizowany)

```json
{
  "version": 2,
  "exercises": [
    {
      "id": 8,
      "name": "Wyciskanie sztangielek",
      "img": "Photos/8.jpg",
      "helperImages": [],
      "sets": 4,
      "reps": "12",
      "weight": "10 kg",
      "active": true,
      "restTimer": true,
      "restSeconds": 60,
      "isTime": false
    }
  ],
  "history": [
    { "date": "2026-04-19", "duration": "01:45", "exported": true },
    { "date": "2026-04-16", "duration": "01:42", "exported": true }
  ],
  "current": null,
  "packingDate": "2026-05-10",
  "goalDays": 3.5
}
```

### 17.2. Diagram cyklu życia treningu

```
[screen-home]
    | klik START
    v
[screen-pack] (jeśli niespakowane dziś)
    | tap kafelków + ✓ lub auto po 11/11
    v
[screen-list]   ← (z tu można kliknąć ćwiczenie)
    |  klik ćwiczenia
    v
[screen-exercise]
    | klik ✓
    +--> nie wszystkie serie w ćwiczeniu? -- tak --> [rest-overlay] -- timer/skip --> z powrotem
    |
    | wszystkie serie? --> [celebration] --> goToNextExerciseOrList()
    |                                              |
    |                                              v
    +-- jest następne ćwiczenie? -- tak --> [screen-exercise] (next)
    |                              -- nie --> [screen-list]
    |
    +-- wszystkie ćwiczenia ukończone? -- tak --> finishTraining()
                                                     |
                                                     +--> dodaj wpis do history
                                                     +--> state.current = null
                                                     +--> [screen-home] + eksport w tle
```

### 17.3. Słownik pojęć

| Pojęcie | Znaczenie |
|---------|-----------|
| **Seria** (set) | Pojedyncze "podejście" w ćwiczeniu (np. 12 powtórzeń) |
| **Powtórzenia** (reps) | Liczba powtórzeń w jednej serii |
| **Przerwa** | Czas między seriami (typowo 60 s) |
| **3M** | Średnia liczba dni między treningami w ostatnich 3 miesiącach |
| **BR** | Średnia w bieżącym roku (BR = Bieżący Rok) |
| **Brek** (🔁) | Liczba dni przerwy między danym treningiem a poprzednim |
| **Cel (goalDays)** | Pożądana średnia długość przerwy między treningami |
| **Pakowanie** | Ekran z kafelkami przedmiotów do zabrania na siłownię |
| **PWA** | Progressive Web App — strona instalowana jak aplikacja |
| **Service Worker** | Skrypt cachujący zasoby w tle przeglądarki |
| **Apps Script** | Backend Google do operacji na Sheets |
| **State** | Główny obiekt JS z całymi danymi aplikacji |
| **localStorage** | Magazyn klucz-wartość w przeglądarce, ~5–10 MB |
| **screen** | Pojedyncza "strona" w aplikacji (sekcja HTML) |

---

## Koniec dokumentacji

W razie pytań — kontakt z właścicielem aplikacji.

W razie potrzeby aktualizacji tej dokumentacji — plik źródłowy markdown w repo, edytuj i commituj.
