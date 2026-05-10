# SIŁKA 3 — PWA (vGPT_1.0.0)

Progresywna aplikacja webowa, instalowalna jak natywna apka na Androidzie.
Prowadzi przez trening siłowy, zbiera historię, eksportuje do Google Sheets.

## Aktualna wersja vGPT_1.0.0

- 🆕 **Reset treningu** — przytrzymanie START przez 2 s otwiera dialog
  potwierdzenia i kasuje niedokończony trening (historia nietknięta)
- 🐛 **Naprawione** — krótki klik START już nie kasuje niedokończonego
  treningu, tylko go **kontynuuje**
- 🆕 Numer wersji w rogu (3× klik = konfiguracja URL eksportu)
- 🆕 **Eksport do Google Sheets** automatyczny po treningu
- 🆕 **Import na żądanie** (ikona ⤓ w nagłówku tabeli)
- 🎨 Tabela: stonowana alternacja, kolumny istotne wytłuszczone,
  jaśniejszy nagłówek, ikony edycji/importu w nagłówku
- 🎨 Lista ćwiczeń: tylko zdjęcie + nazwa + 0/4. Wykonane spadają na dół
- 🎨 Większe, bardziej widoczne ⌂ i ←
- 🎨 Wyciszone: ⚙️, ✏️, wersja
- 🎨 Minutnik bez sekund, w oprawie zegarka, w środku panelu
- 🎨 Animacja po ćwiczeniu — sam rozbłysk supernowa (~1.5 s), bez "BRAWO"
- 🎨 Tylko START na ekranie home (bez "Edytuj")

## Pliki

```
SILKA3_vGPT/
├── index.html, styles.css, app.js
├── manifest.json, sw.js
├── google-apps-script.gs    ← do wklejenia w Apps Script
├── icon-192.png, icon-512.png, icon-maskable-512.png
└── Photos/1.jpg … 17.jpg
```

## Deployment na GitHub Pages

1. `manifest.json` ma już `start_url` i `scope` ustawione na `/SILKA3_vGPT/`
2. Wrzuć wszystkie pliki do **głównego katalogu** repo `SILKA3_vGPT`
3. Podmień pliki w `Photos/` swoimi zdjęciami, jeśli trzeba
4. Settings → Pages → Source: `main` / `(root)` → Save
5. Otwórz w Chrome na Androidzie → "Dodaj do ekranu głównego"

## Konfiguracja eksportu do Google Sheets

### 1. Utwórz arkusz
- https://sheets.google.com → `[+]`
- Nazwij **SILKA3**
- W pierwszym wierszu wpisz nagłówki:
  `Nr | Data | Dzień | Czas | Przerwa | 3M | BR`

### 2. Dodaj skrypt
- W arkuszu: **Rozszerzenia → Apps Script**
- Usuń zawartość `Code.gs`
- Wklej zawartość pliku `google-apps-script.gs`
- Zapisz (Ctrl+S)

### 3. Wdróż jako Web App
- **Wdróż → Nowe wdrożenie**
- Koło zębate → **Aplikacja internetowa**
- **Wykonaj jako:** Ja, **Kto ma dostęp:** Wszyscy
- **Wdróż**
- Przy pierwszym wdrożeniu Google ostrzeże:
  - "Google nie zweryfikowało" → **Zaawansowane** → **Przejdź do projektu**
- Skopiuj URL kończący się na `/exec`

### 4. Wprowadź URL do aplikacji
- Otwórz SIŁKA 3
- Lewy róg tabeli historii — `vGPT_1.0.0`
- **Kliknij 3× szybko**
- Wklej URL → OK

## Jak działa eksport / import

**Eksport** dzieje się automatycznie po każdym ukończonym treningu.
Wysyłane są tylko nowe wpisy (znacznik `exported=false` → `true` po sukcesie).

**Edycja daty w apce** automatycznie ustawia znacznik na `false`,
więc poprawiony wpis zostanie dosłany przy następnej okazji.

**Import** (ikona ⤓ w nagłówku) — nadpisuje lokalną historię w apce
danymi z arkusza. Użyj jeśli edytowałeś coś na komputerze.

## Lokalne testy

```bash
cd SILKA3_vGPT
python3 -m http.server 8080
```
Otwórz `http://localhost:8080`.
